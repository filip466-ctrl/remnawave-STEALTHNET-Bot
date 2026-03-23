#!/bin/bash
cd "$(dirname "$0")"
python3 git-manager.py || python git-manager.py
