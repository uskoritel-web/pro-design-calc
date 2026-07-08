#!/usr/bin/env bash
# Деплой калькулятора на NetAngels (сборка → загрузка → перезапуск).
# Запуск из корня проекта:  bash deploy-netangels.sh
# app/.env на сервере НЕ трогается (пароль/секреты сохраняются).
set -e

KEY="${NETANGELS_KEY:-/c/Users/valentin/Documents/komplectacia/_secrets/netangels_deploy_key}"
HOST="c502015@h66.netangels.ru"
SSHO="-i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

echo "1/4 Сборка фронтенда…"
npm run build

echo "2/4 Упаковка…"
tar czf dist.tgz -C dist .
tar czf server.tgz -C server --exclude=node_modules --exclude=.env .

echo "3/4 Загрузка…"
scp $SSHO dist.tgz server.tgz "$HOST:~/kalkulator-mebeli.na4u.ru/tmp/"
rm -f dist.tgz server.tgz

echo "4/4 Развёртывание…"
ssh $SSHO "$HOST" 'bash -s' <<'REMOTE'
set -e
S=~/kalkulator-mebeli.na4u.ru
tar xzf "$S/tmp/server.tgz" -C "$S/app"
rm -f "$S/app/index.html"
rm -rf "$S/app/public" && mkdir -p "$S/app/public"
tar xzf "$S/tmp/dist.tgz" -C "$S/app/public"
mkdir -p "$S/storage/uploads"
export NVM_DIR=~/.nvm; . "$NVM_DIR/nvm.sh"; nvm use 20.20.2 >/dev/null 2>&1
cd "$S/app" && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
rm -f "$S/tmp/dist.tgz" "$S/tmp/server.tgz"
touch "$S/reload"
echo "Развёрнуто, приложение перезапущено."
REMOTE

echo "Готово: https://kalkulator-mebeli.na4u.ru"
