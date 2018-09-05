
SET SCRIPT_PATH=C:\App\GitHub\ITApps-BI\prjCoreJava\temp
SET JAVA_HOME=c:\App\java\64bit\jdk1.8.0_181
SET PATH=%JAVA_HOME%\bin;%PATH%

IF "%1."=="." GOTO NOPARAM

java -cp %SCRIPT_PATH%\mail.jar;%SCRIPT_PATH%\SendMail.jar com.itapps.genesys.SendMail %1

GOTO :EOF

:NOPARAM
echo "No parameter - exit code 3"
