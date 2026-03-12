#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Git Manager — универсальный кроссплатформенный менеджер Git-репозитория.
Закинь в любой проект, запусти — и управляй через интерактивное меню.

Без внешних зависимостей. Python 3.7+. Windows / Linux / macOS.
"""

import os
import sys
import subprocess
import platform
import shutil
import signal
import json
import tempfile
import stat
from datetime import datetime
from pathlib import Path

# ══════════════════════════════════════════════════════════════
#   КРОССПЛАТФОРМЕННЫЙ ВВОД (Windows msvcrt / Unix termios)
# ══════════════════════════════════════════════════════════════

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    import msvcrt

    def read_key():
        """Читает нажатие клавиши на Windows. Возвращает строку-идентификатор."""
        ch = msvcrt.getwch()
        if ch in ("\x00", "\xe0"):
            ch2 = msvcrt.getwch()
            mapping = {"H": "UP", "P": "DOWN", "K": "LEFT", "M": "RIGHT"}
            return mapping.get(ch2, "UNKNOWN")
        if ch == "\r":
            return "ENTER"
        if ch == "\x1b":
            return "ESC"
        if ch == "\x03":
            raise KeyboardInterrupt
        return ch
else:
    import tty
    import termios

    def read_key():
        """Читает нажатие клавиши на Unix. Возвращает строку-идентификатор."""
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            ch = sys.stdin.read(1)
            if ch == "\x1b":
                seq = sys.stdin.read(2)
                mapping = {"[A": "UP", "[B": "DOWN", "[C": "RIGHT", "[D": "LEFT"}
                return mapping.get(seq, "ESC")
            if ch in ("\r", "\n"):
                return "ENTER"
            if ch == "\x03":
                raise KeyboardInterrupt
            return ch
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)


# ══════════════════════════════════════════════════════════════
#   УТИЛИТЫ ТЕРМИНАЛА
# ══════════════════════════════════════════════════════════════

class Colors:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"
    RED     = "\033[91m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    BLUE    = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN    = "\033[96m"
    WHITE   = "\033[97m"
    GRAY    = "\033[90m"
    BG_BLUE = "\033[44m"
    BG_DARK = "\033[48;5;236m"


def clear_screen():
    os.system("cls" if IS_WINDOWS else "clear")


def get_terminal_width():
    return shutil.get_terminal_size((60, 24)).columns


def enable_ansi_windows():
    """Включает ANSI escape codes в Windows Terminal / cmd."""
    if IS_WINDOWS:
        os.system("")
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════
#   GIT-ОБЁРТКА
# ══════════════════════════════════════════════════════════════

CONFIG_PATH = Path.home() / ".git-manager.json"


def load_config():
    """Загружает конфиг из ~/.git-manager.json."""
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_config(cfg):
    """Сохраняет конфиг в ~/.git-manager.json."""
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def get_active_account(cfg):
    """Возвращает (имя, данные) активного аккаунта или (None, None)."""
    name = cfg.get("active_account")
    if name and name in cfg.get("accounts", {}):
        return name, cfg["accounts"][name]
    return None, None


def get_active_repo(cfg):
    """Возвращает (label, url) активного репо из активного аккаунта или (None, None)."""
    _, acc = get_active_account(cfg)
    if not acc:
        return None, None
    repo_name = acc.get("active_repo")
    repos = acc.get("repos", {})
    if repo_name and repo_name in repos:
        return repo_name, repos[repo_name]
    return None, None


def get_auth_env(cfg):
    """Возвращает dict переменных окружения для авторизации git."""
    _, acc = get_active_account(cfg)
    if not acc:
        return {}

    auth_type = acc.get("auth_type", "")

    if auth_type == "ssh_key":
        key_path = acc.get("ssh_key", "")
        if key_path and os.path.isfile(key_path):
            return {
                "GIT_SSH_COMMAND": f'ssh -i "{key_path}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no'
            }

    elif auth_type == "token":
        token = acc.get("token", "")
        if token:
            # Создаём временный askpass-скрипт
            if IS_WINDOWS:
                script = tempfile.NamedTemporaryFile(
                    mode="w", suffix=".bat", delete=False, encoding="utf-8"
                )
                script.write(f"@echo {token}\n")
                script.close()
            else:
                script = tempfile.NamedTemporaryFile(
                    mode="w", suffix=".sh", delete=False, encoding="utf-8"
                )
                script.write(f"#!/bin/sh\necho '{token}'\n")
                script.close()
                os.chmod(script.name, stat.S_IRWXU)
            return {"GIT_ASKPASS": script.name, "_ASKPASS_TEMP": script.name}

    return {}


def cleanup_auth_env(env_extra):
    """Удаляет временный askpass-скрипт, если создавался."""
    tmp = env_extra.get("_ASKPASS_TEMP")
    if tmp and os.path.isfile(tmp):
        try:
            os.remove(tmp)
        except OSError:
            pass


def apply_account_git_config(acc):
    """Устанавливает git user.name и user.email из аккаунта (локально для репо)."""
    username = acc.get("username", "")
    email = acc.get("email", "")
    if username:
        git("config", "user.name", username)
    if email:
        git("config", "user.email", email)


def apply_repo_remote(repo_url):
    """Устанавливает origin на указанный URL."""
    remotes = git_remote_names()
    if "origin" in remotes:
        git("remote", "set-url", "origin", repo_url)
    else:
        git("remote", "add", "origin", repo_url)

def git(*args, capture=True, check=False, env=None):
    """Запускает git-команду. Возвращает (returncode, stdout).
    env — дополнительные переменные окружения (для авторизации)."""
    cmd = ["git"] + list(args)
    run_env = None
    if env:
        run_env = {**os.environ, **env}
        # Убираем внутренний маркер
        run_env.pop("_ASKPASS_TEMP", None)
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=REPO_ROOT,
            env=run_env,
        )
        stdout = (result.stdout or "").strip()
        if check and result.returncode != 0:
            stderr = (result.stderr or "").strip()
            raise RuntimeError(f"git {' '.join(args)} failed:\n{stderr}")
        return result.returncode, stdout
    except FileNotFoundError:
        print(f"\n{Colors.RED}  Ошибка: git не найден! Установи Git и добавь в PATH.{Colors.RESET}")
        sys.exit(1)


def git_branch():
    rc, out = git("rev-parse", "--abbrev-ref", "HEAD")
    if out == "HEAD":
        rc2, tag = git("describe", "--tags", "--exact-match")
        if rc2 == 0:
            return f"detached @ {tag}"
        _, h = git("rev-parse", "--short", "HEAD")
        return f"detached @ {h}"
    return out


def git_status_short():
    _, out = git("status", "--porcelain")
    return out


def git_last_commit():
    _, out = git("log", "-1", "--pretty=format:%h - %s")
    return out if out else "(пусто)"


def git_local_branches():
    _, out = git("branch", "--format=%(refname:short)")
    return [b for b in out.splitlines() if b.strip()]


def git_all_tags(prefix="backup-"):
    _, out = git("tag", "-l", f"{prefix}*", "--sort=-version:refname")
    return [t for t in out.splitlines() if t.strip()]


def git_tag_message(tag):
    _, out = git("tag", "-l", tag, "--format=%(contents)")
    lines = out.strip().splitlines()
    return lines[0] if lines else ""


def git_remote_names():
    _, out = git("remote")
    return [r for r in out.splitlines() if r.strip()]


# ══════════════════════════════════════════════════════════════
#   UI КОМПОНЕНТЫ
# ══════════════════════════════════════════════════════════════

C = Colors


def draw_header():
    clear_screen()
    branch = git_branch()
    status = git_status_short()
    commit = git_last_commit()
    remotes = ", ".join(git_remote_names()) or "нет"

    # Аккаунт и репозиторий из конфига
    cfg = load_config()
    acc_name, acc_data = get_active_account(cfg)
    repo_label, _ = get_active_repo(cfg)

    acc_display = acc_name if acc_name else "не задан"
    repo_display = repo_label if repo_label else "не задан"

    status_text = "есть изменения" if status else "чисто"

    if branch == "main":
        bc = C.GREEN
    elif branch.startswith("detached"):
        bc = C.RED
    else:
        bc = C.YELLOW

    sc = C.GREEN if not status else C.YELLOW
    ac = C.GREEN if acc_name else C.GRAY
    rc = C.GREEN if repo_label else C.GRAY

    if len(commit) > 40:
        commit = commit[:37] + "..."

    w = 52

    print()
    print(f"  {C.CYAN}{'=' * w}{C.RESET}")
    print(f"  {C.CYAN}{C.BOLD}  GIT MANAGER{C.RESET}")
    print(f"  {C.CYAN}{'=' * w}{C.RESET}")
    print(f"  {C.GRAY}  Ветка   : {bc}{branch}{C.RESET}")
    print(f"  {C.GRAY}  Статус  : {sc}{status_text}{C.RESET}")
    print(f"  {C.GRAY}  Коммит  : {C.WHITE}{commit}{C.RESET}")
    print(f"  {C.GRAY}  Remote  : {C.WHITE}{remotes}{C.RESET}")
    print(f"  {C.GRAY}  Аккаунт : {ac}{acc_display}{C.RESET}")
    print(f"  {C.GRAY}  Репо    : {rc}{repo_display}{C.RESET}")
    print(f"  {C.CYAN}{'-' * w}{C.RESET}")
    print()


def draw_menu(items, selected, title=""):
    if title:
        print(f"  {C.CYAN}{C.BOLD}{title}{C.RESET}")
        print()

    for i, item in enumerate(items):
        if i == selected:
            print(f"  {C.CYAN} > {C.RESET}{C.BOLD}{C.WHITE}{C.BG_BLUE} {item} {C.RESET}")
        else:
            print(f"  {C.GRAY}   {item}{C.RESET}")


def interactive_menu(title, items, allow_esc=True):
    """Интерактивное меню со стрелками. Возвращает индекс или -1 (Esc)."""
    selected = 0
    while True:
        draw_header()
        draw_menu(items, selected, title)
        print()
        hint = "[стрелки] Навигация   [Enter] Выбрать"
        if allow_esc:
            hint += "   [Esc] Назад"
        print(f"  {C.GRAY}{hint}{C.RESET}")

        key = read_key()
        if key == "UP" and selected > 0:
            selected -= 1
        elif key == "DOWN" and selected < len(items) - 1:
            selected += 1
        elif key == "ENTER":
            return selected
        elif key == "ESC" and allow_esc:
            return -1


def pause(msg="Нажми любую клавишу..."):
    print()
    print(f"  {C.GRAY}{msg}{C.RESET}")
    read_key()


def ask(prompt):
    """Ввод текста с промптом."""
    return input(f"  {C.CYAN}{prompt}{C.RESET}").strip()


def confirm(prompt, default=False):
    """Подтверждение (y/n)."""
    suffix = " (y/n): "
    ans = input(f"  {C.YELLOW}{prompt}{suffix}{C.RESET}").strip().lower()
    if not ans:
        return default
    return ans in ("y", "yes", "да", "д")


def confirm_danger(prompt):
    """Опасное подтверждение (нужно ввести 'yes')."""
    ans = input(f"  {C.RED}{prompt} (yes/no): {C.RESET}").strip().lower()
    return ans == "yes"


def success(msg):
    print(f"\n  {C.GREEN}[OK] {msg}{C.RESET}")


def error(msg):
    print(f"\n  {C.RED}[ОШИБКА] {msg}{C.RESET}")


def warning(msg):
    print(f"\n  {C.YELLOW}{msg}{C.RESET}")


# ══════════════════════════════════════════════════════════════
#   ДЕЙСТВИЯ
# ══════════════════════════════════════════════════════════════

def do_commit():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}СОЗДАТЬ КОММИТ{C.RESET}\n")

    status = git_status_short()
    if not status:
        warning("Нет изменений для коммита.")
        pause()
        return

    print(f"  {C.GRAY}Изменённые файлы:{C.RESET}")
    for line in status.splitlines():
        flag = line[:2].strip()
        fname = line[3:]
        color = C.GREEN if "?" in flag else C.YELLOW
        print(f"    {color}{flag}{C.RESET}  {fname}")

    print()
    msg = ask("Описание коммита: ")
    if not msg:
        msg = f"update: {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    git("add", "-A")
    rc, out = git("commit", "-m", msg)
    if rc == 0:
        success("Коммит создан!")
    else:
        error(f"Ошибка:\n{out}")
    pause()


def do_push():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}PUSH В REMOTE{C.RESET}\n")

    branch = git_branch()
    if branch.startswith("detached"):
        error("Ты в detached HEAD! Сначала переключись на ветку.")
        pause()
        return

    # Выбор remote
    remotes = git_remote_names()
    if len(remotes) == 0:
        error("Нет remote-ов! Добавь через 'git remote add'.")
        pause()
        return
    elif len(remotes) == 1:
        remote = remotes[0]
    else:
        items = remotes + ["[ Назад ]"]
        idx = interactive_menu("Выбери remote для push", items)
        if idx == -1 or idx == len(items) - 1:
            return
        remote = remotes[idx]

    draw_header()
    print(f"  {C.CYAN}{C.BOLD}PUSH В REMOTE{C.RESET}\n")

    status = git_status_short()
    if status:
        warning("Есть незакоммиченные изменения.")
        if confirm("Закоммитить сейчас?"):
            msg = ask("Описание коммита: ")
            if not msg:
                msg = f"update: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            git("add", "-A")
            git("commit", "-m", msg)

    print(f"\n  {C.GRAY}Пушу ветку '{branch}' в {remote}...{C.RESET}")

    cfg = load_config()
    auth_env = get_auth_env(cfg)
    rc, out = git("push", remote, branch, env=auth_env)

    if rc == 0:
        success(f"Запушено в {remote}/{branch}!")
    else:
        error(f"Ошибка при push.")
        if confirm("Попробовать force push?"):
            rc2, _ = git("push", remote, branch, "--force", env=auth_env)
            if rc2 == 0:
                success("Force push выполнен!")
            else:
                error("Force push тоже не удался.")

    cleanup_auth_env(auth_env)
    pause()


def do_pull():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}PULL ИЗ REMOTE{C.RESET}\n")

    branch = git_branch()
    if branch.startswith("detached"):
        error("Ты в detached HEAD! Сначала переключись на ветку.")
        pause()
        return

    remotes = git_remote_names()
    if len(remotes) == 0:
        error("Нет remote-ов!")
        pause()
        return
    elif len(remotes) == 1:
        remote = remotes[0]
    else:
        items = remotes + ["[ Назад ]"]
        idx = interactive_menu("Выбери remote для pull", items)
        if idx == -1 or idx == len(items) - 1:
            return
        remote = remotes[idx]

    draw_header()
    print(f"  {C.CYAN}{C.BOLD}PULL ИЗ REMOTE{C.RESET}\n")
    print(f"  {C.GRAY}Тяну {remote}/{branch}...{C.RESET}")

    cfg = load_config()
    auth_env = get_auth_env(cfg)
    rc, out = git("pull", remote, branch, env=auth_env)

    if rc == 0:
        success("Pull выполнен!")
        if out:
            print(f"  {C.GRAY}{out}{C.RESET}")
    else:
        error("Ошибка при pull.")

    cleanup_auth_env(auth_env)
    pause()


def do_switch_branch():
    branches = git_local_branches()
    items = branches + ["[ + Создать новую ветку ]", "[ Назад ]"]

    idx = interactive_menu("ПЕРЕКЛЮЧЕНИЕ ВЕТКИ", items)
    if idx == -1 or idx == len(items) - 1:
        return

    if idx == len(items) - 2:
        # Создать новую
        draw_header()
        print(f"  {C.CYAN}{C.BOLD}НОВАЯ ВЕТКА{C.RESET}\n")
        name = ask("Название ветки: ")
        if not name:
            return
        rc, out = git("checkout", "-b", name)
        if rc == 0:
            success(f"Ветка '{name}' создана!")
            if confirm("Запушить в origin?"):
                git("push", "origin", name)
                success(f"Запушено в origin/{name}!")
        else:
            error(out)
        pause()
        return

    selected = branches[idx]
    rc, out = git("checkout", selected)
    if rc == 0:
        draw_header()
        success(f"Переключился на '{selected}'")
    else:
        error(out)
    pause()


def do_create_backup():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}СОЗДАТЬ БЭКАП{C.RESET}\n")

    branch = git_branch()
    if branch.startswith("detached"):
        error("Ты в detached HEAD! Сначала переключись на ветку.")
        pause()
        return

    now = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    tag_name = f"backup-{now}"

    desc = ask("Описание бэкапа (enter = пропустить): ")
    if not desc:
        desc = f"Backup {now}"

    status = git_status_short()
    if status:
        warning("Есть незакоммиченные изменения.")
        if confirm("Включить в бэкап?"):
            git("add", "-A")

    print(f"\n  {C.GRAY}Переключаюсь на ветку backups...{C.RESET}")

    local_branches = git_local_branches()
    if "backups" not in local_branches:
        git("checkout", "-b", "backups")
    else:
        git("checkout", "backups")

    git("add", "-A")
    git("commit", "-m", f"backup: {now} - {desc}")
    git("tag", "-a", tag_name, "-m", desc)

    print(f"  {C.GRAY}Пушу в origin...{C.RESET}")
    rc_push, _ = git("push", "origin", "backups", "--tags")

    git("checkout", branch)

    if rc_push == 0:
        success(f"Бэкап создан: {tag_name}")
    else:
        warning(f"Бэкап создан локально ({tag_name}), но push не удался.")
        warning("Возможно remote 'origin' не настроен.")
    pause()


def do_list_backups():
    tags = git_all_tags("backup-")
    if not tags:
        draw_header()
        warning("Бэкапов не найдено.")
        pause()
        return

    items = []
    for tag in tags:
        msg = git_tag_message(tag)
        display = f"{tag}  --  {msg}" if msg else tag
        items.append(display)
    items.append("[ Назад ]")

    idx = interactive_menu("ВЫБЕРИ БЭКАП", items)
    if idx == -1 or idx == len(items) - 1:
        return

    do_backup_actions(tags[idx])


def do_backup_actions(tag):
    actions = [
        "Просмотр (переключиться, без изменений)",
        "Восстановить в текущую ветку",
        "Восстановить в main + force push",
        "Удалить бэкап",
        "[ Назад ]",
    ]
    idx = interactive_menu(f"ДЕЙСТВИЯ: {tag}", actions)
    if idx == -1 or idx == len(actions) - 1:
        return

    draw_header()

    if idx == 0:
        print(f"  {C.CYAN}Переключаюсь на {tag}...{C.RESET}")
        git("checkout", tag)
        success(f"Просматриваешь бэкап: {tag}")
        print(f"  {C.GRAY}Для возврата — 'Переключить ветку' в меню.{C.RESET}")
        pause()

    elif idx == 1:
        branch = git_branch()
        warning(f"Ветка '{branch}' будет сброшена до {tag}!")
        if confirm_danger("Продолжить?"):
            git("reset", "--hard", tag)
            success(f"'{branch}' восстановлена из {tag}")
        else:
            print(f"  {C.GRAY}Отмена.{C.RESET}")
        pause()

    elif idx == 2:
        print(f"  {C.RED}{C.BOLD}  !!! ТОЧКА НЕВОЗВРАТА !!!{C.RESET}")
        warning("main будет перезаписан и отправлен force push!")
        if confirm_danger("Ты АБСОЛЮТНО уверен?"):
            git("checkout", "main")
            git("reset", "--hard", tag)
            git("push", "origin", "main", "--force")
            success(f"main восстановлен из {tag} и запушен!")
        else:
            print(f"  {C.GRAY}Отмена.{C.RESET}")
        pause()

    elif idx == 3:
        warning(f"Удалить тег {tag} локально и из remote?")
        if confirm_danger("Продолжить?"):
            git("tag", "-d", tag)
            git("push", "origin", ":refs/tags/" + tag)
            success(f"Бэкап {tag} удалён!")
        else:
            print(f"  {C.GRAY}Отмена.{C.RESET}")
        pause()


def do_stash():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}STASH (СПРЯТАТЬ/ДОСТАТЬ ИЗМЕНЕНИЯ){C.RESET}\n")

    _, stash_list = git("stash", "list")
    stashes = [s for s in stash_list.splitlines() if s.strip()] if stash_list else []

    items = [
        "Спрятать текущие изменения (stash push)",
        f"Достать последний stash ({len(stashes)} сохранено)",
        "[ Назад ]",
    ]
    idx = interactive_menu("STASH", items)
    if idx == -1 or idx == 2:
        return

    draw_header()
    if idx == 0:
        desc = ask("Описание (enter = пропустить): ")
        if desc:
            rc, out = git("stash", "push", "-m", desc)
        else:
            rc, out = git("stash", "push")
        if rc == 0:
            success("Изменения спрятаны!")
        else:
            error(out)
    elif idx == 1:
        if not stashes:
            warning("Stash пуст.")
        else:
            rc, out = git("stash", "pop")
            if rc == 0:
                success("Изменения восстановлены из stash!")
            else:
                error(out)
    pause()


def do_log():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}ПОСЛЕДНИЕ 20 КОММИТОВ{C.RESET}\n")

    _, out = git("log", "--oneline", "--graph", "--decorate", "-20")
    if out:
        for line in out.splitlines():
            print(f"  {C.GRAY}{line}{C.RESET}")
    else:
        warning("Нет коммитов.")
    pause()


def do_diff():
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}ИЗМЕНЕНИЯ (DIFF){C.RESET}\n")

    _, out = git("diff", "--stat")
    if not out:
        _, out = git("diff", "--cached", "--stat")
    if out:
        for line in out.splitlines():
            if "+" in line and "|" in line:
                print(f"  {C.GREEN}{line}{C.RESET}")
            elif "-" in line and "|" in line:
                print(f"  {C.RED}{line}{C.RESET}")
            else:
                print(f"  {C.GRAY}{line}{C.RESET}")
    else:
        warning("Нет изменений.")
    pause()


# ══════════════════════════════════════════════════════════════
#   АККАУНТЫ / РЕПОЗИТОРИИ
# ══════════════════════════════════════════════════════════════

def do_add_account():
    """Добавить новый аккаунт (SSH key или HTTPS token)."""
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}ДОБАВИТЬ АККАУНТ{C.RESET}\n")

    name = ask("Название аккаунта (латиница): ")
    if not name:
        return

    cfg = load_config()
    accounts = cfg.setdefault("accounts", {})

    if name in accounts:
        error(f"Аккаунт '{name}' уже существует!")
        pause()
        return

    username = ask("Имя пользователя (git user.name): ")
    email = ask("Email (git user.email): ")

    # Выбор типа авторизации
    auth_items = ["HTTPS токен (ghp_...)", "SSH ключ", "[ Назад ]"]
    auth_idx = interactive_menu("Тип авторизации", auth_items)
    if auth_idx == -1 or auth_idx == 2:
        return

    acc = {
        "username": username,
        "email": email,
        "repos": {},
        "active_repo": None,
    }

    if auth_idx == 0:
        # Токен
        draw_header()
        print(f"  {C.CYAN}{C.BOLD}ДОБАВИТЬ АККАУНТ — ТОКЕН{C.RESET}\n")
        token = ask("GitHub Token: ")
        if not token:
            return
        acc["auth_type"] = "token"
        acc["token"] = token
    else:
        # SSH ключ
        draw_header()
        print(f"  {C.CYAN}{C.BOLD}ДОБАВИТЬ АККАУНТ — SSH{C.RESET}\n")
        key_path = ask("Путь к SSH ключу: ")
        if not key_path:
            return
        key_path = os.path.expanduser(key_path)
        if not os.path.isfile(key_path):
            error(f"Файл не найден: {key_path}")
            pause()
            return
        acc["auth_type"] = "ssh_key"
        acc["ssh_key"] = key_path

    accounts[name] = acc

    # Если это первый аккаунт — сделать активным
    if not cfg.get("active_account"):
        cfg["active_account"] = name
        apply_account_git_config(acc)

    save_config(cfg)
    success(f"Аккаунт '{name}' добавлен!")

    if confirm("Добавить репозиторий к этому аккаунту?"):
        _add_repo_to_account(cfg, name)
    else:
        pause()


def do_switch_account():
    """Переключить активный аккаунт. Предлагает сменить репо."""
    cfg = load_config()
    accounts = cfg.get("accounts", {})
    if not accounts:
        draw_header()
        warning("Нет добавленных аккаунтов.")
        pause()
        return

    names = list(accounts.keys())
    active = cfg.get("active_account")

    display = []
    for n in names:
        marker = " ← активный" if n == active else ""
        display.append(f"{n} ({accounts[n].get('username', '?')}){marker}")
    display.append("[ Назад ]")

    idx = interactive_menu("ПЕРЕКЛЮЧИТЬ АККАУНТ", display)
    if idx == -1 or idx == len(display) - 1:
        return

    chosen = names[idx]
    cfg["active_account"] = chosen
    acc = accounts[chosen]
    apply_account_git_config(acc)
    save_config(cfg)
    success(f"Активный аккаунт: {chosen}")

    # Предложить сменить репозиторий
    repos = acc.get("repos", {})
    if repos:
        print()
        warning("Сменить активный репозиторий?")
        repo_names = list(repos.keys())
        repo_items = [f"{rn}  ({repos[rn][:50]})" for rn in repo_names]
        repo_items.append("Оставить текущий")
        repo_idx = interactive_menu("ВЫБЕРИ РЕПОЗИТОРИЙ", repo_items)

        if repo_idx != -1 and repo_idx < len(repo_names):
            repo_label = repo_names[repo_idx]
            acc["active_repo"] = repo_label
            save_config(cfg)
            apply_repo_remote(repos[repo_label])
            success(f"Активный репо: {repo_label}")
    pause()


def do_delete_account():
    """Удалить аккаунт."""
    cfg = load_config()
    accounts = cfg.get("accounts", {})
    if not accounts:
        draw_header()
        warning("Нет добавленных аккаунтов.")
        pause()
        return

    names = list(accounts.keys())
    display = [f"{n} ({accounts[n].get('username', '?')})" for n in names]
    display.append("[ Назад ]")

    idx = interactive_menu("УДАЛИТЬ АККАУНТ", display)
    if idx == -1 or idx == len(display) - 1:
        return

    chosen = names[idx]
    draw_header()
    if not confirm_danger(f"Удалить аккаунт '{chosen}' со всеми репозиториями?"):
        print(f"  {C.GRAY}Отмена.{C.RESET}")
        pause()
        return

    del accounts[chosen]
    if cfg.get("active_account") == chosen:
        # Переключить на первый оставшийся или очистить
        if accounts:
            first = next(iter(accounts))
            cfg["active_account"] = first
            apply_account_git_config(accounts[first])
        else:
            cfg["active_account"] = None

    save_config(cfg)
    success(f"Аккаунт '{chosen}' удалён!")
    pause()


def do_add_repo():
    """Добавить репозиторий к активному аккаунту."""
    cfg = load_config()
    acc_name, acc = get_active_account(cfg)
    if not acc:
        draw_header()
        warning("Сначала добавь аккаунт!")
        pause()
        return

    _add_repo_to_account(cfg, acc_name)


def _add_repo_to_account(cfg, acc_name):
    """Внутренняя: добавить репо к указанному аккаунту."""
    acc = cfg["accounts"][acc_name]
    draw_header()
    print(f"  {C.CYAN}{C.BOLD}ДОБАВИТЬ РЕПОЗИТОРИЙ к '{acc_name}'{C.RESET}\n")

    label = ask("Название репозитория (label): ")
    if not label:
        return

    repos = acc.setdefault("repos", {})
    if label in repos:
        error(f"Репозиторий '{label}' уже существует!")
        pause()
        return

    url = ask("Git URL (https://... или git@...): ")
    if not url:
        return

    repos[label] = url

    # Если у аккаунта нет активного репо — сделать этот активным
    if not acc.get("active_repo"):
        acc["active_repo"] = label
        apply_repo_remote(url)

    save_config(cfg)
    success(f"Репозиторий '{label}' добавлен!")
    pause()


def do_switch_repo():
    """Переключить активный репозиторий (из текущего аккаунта)."""
    cfg = load_config()
    acc_name, acc = get_active_account(cfg)
    if not acc:
        draw_header()
        warning("Сначала добавь аккаунт!")
        pause()
        return

    repos = acc.get("repos", {})
    if not repos:
        draw_header()
        warning("У аккаунта нет репозиториев. Добавь сначала.")
        pause()
        return

    repo_names = list(repos.keys())
    active_repo = acc.get("active_repo")

    display = []
    for rn in repo_names:
        marker = " ← активный" if rn == active_repo else ""
        display.append(f"{rn}  ({repos[rn][:50]}){marker}")
    display.append("[ Назад ]")

    idx = interactive_menu("ПЕРЕКЛЮЧИТЬ РЕПОЗИТОРИЙ", display)
    if idx == -1 or idx == len(display) - 1:
        return

    chosen = repo_names[idx]
    acc["active_repo"] = chosen
    save_config(cfg)
    apply_repo_remote(repos[chosen])
    success(f"Активный репо: {chosen}")
    pause()


def do_delete_repo():
    """Удалить репозиторий из активного аккаунта."""
    cfg = load_config()
    acc_name, acc = get_active_account(cfg)
    if not acc:
        draw_header()
        warning("Сначала добавь аккаунт!")
        pause()
        return

    repos = acc.get("repos", {})
    if not repos:
        draw_header()
        warning("У аккаунта нет репозиториев.")
        pause()
        return

    repo_names = list(repos.keys())
    display = [f"{rn}  ({repos[rn][:50]})" for rn in repo_names]
    display.append("[ Назад ]")

    idx = interactive_menu("УДАЛИТЬ РЕПОЗИТОРИЙ", display)
    if idx == -1 or idx == len(display) - 1:
        return

    chosen = repo_names[idx]
    draw_header()
    if not confirm_danger(f"Удалить репозиторий '{chosen}'?"):
        print(f"  {C.GRAY}Отмена.{C.RESET}")
        pause()
        return

    del repos[chosen]
    if acc.get("active_repo") == chosen:
        if repos:
            first = next(iter(repos))
            acc["active_repo"] = first
            apply_repo_remote(repos[first])
        else:
            acc["active_repo"] = None

    save_config(cfg)
    success(f"Репозиторий '{chosen}' удалён!")
    pause()


def do_accounts_menu():
    """Подменю: Аккаунты / Репозитории."""
    ACCOUNT_MENU = [
        "Переключить аккаунт",
        "Добавить аккаунт",
        "Удалить аккаунт",
        "Переключить репозиторий",
        "Добавить репозиторий",
        "Удалить репозиторий",
        "[ Назад ]",
    ]
    while True:
        idx = interactive_menu("АККАУНТЫ / РЕПОЗИТОРИИ", ACCOUNT_MENU)
        if idx == -1 or idx == 6:
            return

        account_actions = {
            0: do_switch_account,
            1: do_add_account,
            2: do_delete_account,
            3: do_switch_repo,
            4: do_add_repo,
            5: do_delete_repo,
        }
        fn = account_actions.get(idx)
        if fn:
            fn()


# ══════════════════════════════════════════════════════════════
#   ГЛАВНОЕ МЕНЮ
# ══════════════════════════════════════════════════════════════

MAIN_MENU = [
    "Коммит",
    "Push в remote",
    "Pull из remote",
    "Переключить ветку",
    "Создать бэкап",
    "Бэкапы / Восстановить",
    "Stash (спрятать/достать)",
    "Лог коммитов",
    "Diff (изменения)",
    "Аккаунты / Репозитории",
    "Выход",
]


def main():
    enable_ansi_windows()

    # Проверка: мы в git-репозитории?
    rc, _ = git("rev-parse", "--git-dir")
    if rc != 0:
        print(f"\n{Colors.RED}  Ошибка: не найден git-репозиторий в этой папке!{Colors.RESET}")
        print(f"{Colors.GRAY}  Запусти скрипт из корня git-проекта.{Colors.RESET}\n")
        sys.exit(1)

    while True:
        try:
            idx = interactive_menu("ГЛАВНОЕ МЕНЮ", MAIN_MENU, allow_esc=False)

            actions = {
                0: do_commit,
                1: do_push,
                2: do_pull,
                3: do_switch_branch,
                4: do_create_backup,
                5: do_list_backups,
                6: do_stash,
                7: do_log,
                8: do_diff,
                9: do_accounts_menu,
                10: lambda: sys.exit(0),
            }

            fn = actions.get(idx)
            if fn:
                fn()

        except KeyboardInterrupt:
            print(f"\n\n  {C.CYAN}Пока!{C.RESET}\n")
            sys.exit(0)
        except Exception as e:
            print(f"\n  {C.RED}Неожиданная ошибка: {e}{C.RESET}")
            pause()


# ══════════════════════════════════════════════════════════════
#   ТОЧКА ВХОДА
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Определяем корень репозитория от текущей директории
    REPO_ROOT = os.getcwd()
    main()
