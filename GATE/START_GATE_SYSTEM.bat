@echo off
echo ==============================================
echo        STARTING THE GATE SYSTEM...
echo ==============================================

echo Starting the Backend Server and Database...
start cmd /k "cd server && npm run start"

echo Starting the Frontend Dashboards and Scanner...
start cmd /k "cd client && npm run dev"

echo ==============================================
echo The system is starting up!
echo Please wait a few seconds, then open:
echo http://localhost:5175 in your browser.
echo ==============================================
pause
