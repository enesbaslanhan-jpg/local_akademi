@echo off
echo === Prisma Validate ===
call npx prisma validate
echo.
echo === Prisma Migrate Status ===
call npx prisma migrate status
echo.
echo === Backend TSC ===
call npx tsc --noEmit
echo.
echo === Backend Build ===
call npm run build
echo.
echo === Frontend Tests ===
cd frontend
call npm test -- --run
echo.
echo === Frontend Build ===
call npm run build
cd ..
echo.
echo === Git Status ===
git status --short
echo.
echo === Git Diff Stat ===
git diff --stat
