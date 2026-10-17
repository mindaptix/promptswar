set -eu
ls -ld /var/www/promptswar/current-next /var/www/promptswar/releases/20261017-auth-db
systemctl cat promptswar | grep -E 'WorkingDirectory|ExecStart|EnvironmentFile'
find /var/www/promptswar/releases/20261017-auth-db/.next/server/app/api -type f | head
curl -sS -o /dev/null -w 'api-status:%{http_code}\n' http://127.0.0.1:3002/api/auth/signup
