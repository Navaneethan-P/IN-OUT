@echo off
echo ====================================================================
echo Starting Prisma Database Dashboard...
echo This will open a browser window to manage your local database.
echo Close this terminal window to stop the dashboard.
echo ====================================================================
cd server
npx prisma studio
pause
