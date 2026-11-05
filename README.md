# Длинные нарды: приложение для Android

Игра лежит в `www/` (один файл `index.html`, работает без интернета). Исходники интерфейса и движка: `build/`, сборка командой `sh build/build.sh`.

## Способ 1. Установить за 2 минуты (без APK)
1. Откройте https://app.netlify.com/drop и перетащите туда папку `www`. Получите ссылку вида `https://что-то.netlify.app`.
2. Откройте ссылку в Chrome на телефоне, меню ⋮ → «Установить приложение» (или «Добавить на главный экран»).
3. Иконка появится в списке приложений, игра откроется на весь экран и будет работать офлайн.

## Способ 2. Настоящий APK через GitHub (ничего ставить на компьютер не нужно)
1. Создайте репозиторий на github.com и загрузите в него всё содержимое этой папки (вместе с `.github`).
2. Вкладка Actions → «Собрать APK» → Run workflow. Через 5-10 минут внизу страницы запуска появится файл `nardy-apk`.
3. Распакуйте архив, перекиньте `app-debug.apk` на телефон и откройте. Разрешите установку из этого источника.

## Способ 3. APK на своём компьютере
Нужны Node.js 22 и Android Studio (JDK 21):
```
npm install
npx cap add android
cp -r android-res/mipmap-* android/app/src/main/res/
npx cap sync android
npx cap open android
```
В Android Studio: Build → Build APK(s). Чтобы игра не вращалась, добавьте `android:screenOrientation="portrait"` к `<activity>` в `AndroidManifest.xml`.
