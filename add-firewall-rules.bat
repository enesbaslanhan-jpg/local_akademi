@echo off
echo LocalAkademi Beta - Firewall Rules
echo ==================================
echo.
echo Adding rules for Private network only...
netsh advfirewall firewall add rule name="LocalAkademi Backend 3000" dir=in action=allow protocol=TCP localport=3000 profile=private description="LocalAkademi Beta Backend"
netsh advfirewall firewall add rule name="LocalAkademi Frontend 5173" dir=in action=allow protocol=TCP localport=5173 profile=private description="LocalAkademi Beta Frontend (Vite)"
echo.
echo Done. Rules added for ports 3000 and 5173 on Private networks.
pause
