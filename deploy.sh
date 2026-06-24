#!/bin/bash
set -e
cd /var/www/lawcrm
git pull origin main
cd web && PATH=/usr/lib/ispnodejs/bin:$PATH npm run build && cd ..
cp -rf web/dist/. /var/www/www-root/data/www/lawcrm.su/
systemctl restart lawcrm-backend
nginx -s reload
echo "DEPLOY_OK $(date)"
