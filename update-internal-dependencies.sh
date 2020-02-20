rm -rf src/css
npm  --no-save --registry=http://npm.internal.equipmentshare.com i @equipmentshare/es-foundation
npx foundation --targetDirectory=src/css

rm -rf es-internal
npm  --no-save --registry=http://npm.internal.equipmentshare.com i @equipmentshare/eslint-config-es-base-js@1
cd node_modules/\@equipmentshare/
npx cpy --parents ** ../../es-internal
cd ../../
