@echo off
echo ==============================
echo 🚀 Fix Git push script (v2)
echo ==============================

cd /d D:\ThamAI_monorepo

:: Xóa file lock nếu còn
del /f /q .git\index.lock 2>nul
rd /s /q .git\rebase-merge 2>nul
rd /s /q .git\rebase-apply 2>nul

:: Chắc chắn checkout về nhánh main
git checkout main

:: Kéo bản mới nhất từ GitHub
git fetch origin

:: Ép local đồng bộ với remote
git reset --hard origin/main

:: Kéo lại để chắc chắn sạch sẽ
git pull origin main

echo ==============================
echo ✅ Hoàn tất xử lý push Git
echo ==============================
pause
