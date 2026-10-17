journalctl -u promptswar -n 80 --no-pager | tail -40
grep -E '^(DATABASE_URL|AUTH_SECRET)=' /etc/promptswar/app.env | sed 's/=.*$/=<configured>/'
