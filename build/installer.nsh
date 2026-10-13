!macro customInstall

ExecWait '"msiexec.exe" /i "$INSTDIR\resources\installer\mongodb.msi" /quiet /norestart'

ExecWait '"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --install'

ExecWait 'net start MongoDB'

!macroend