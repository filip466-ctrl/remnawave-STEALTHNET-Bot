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
from datetime import datetime

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

def git(*args, capture=True, check=False):
    """Запускает git-команду. Возвращает (returncode, stdout)."""
    cmd = ["git"] + list(args)
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=REPO_ROOT,
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

    status_text = "есть изменения" if status else "чисто"

    if branch == "main":
        bc = C.GREEN
    elif branch.startswith("detached"):
        bc = C.RED
    else:
        bc = C.YELLOW

    sc = C.GREEN if not status else C.YELLOW

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
    rc, out = git("push", remote, branch)

    if rc == 0:
        success(f"Запушено в {remote}/{branch}!")
    else:
        error(f"Ошибка при push.")
        if confirm("Попробовать force push?"):
            rc2, _ = git("push", remote, branch, "--force")
            if rc2 == 0:
                success("Force push выполнен!")
            else:
                error("Force push тоже не удался.")
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
    rc, out = git("pull", remote, branch)

    if rc == 0:
        success("Pull выполнен!")
        if out:
            print(f"  {C.GRAY}{out}{C.RESET}")
    else:
        error("Ошибка при pull.")
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
                9: lambda: sys.exit(0),
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
