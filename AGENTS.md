# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Согласованные решения проекта

- Сайт — подарок папе на День отца от Артема.
- Надписи: «С ДНЁМ ОТЦА!», «САМЫЙ ЛУЧШИЙ ПАПА», «ЛЮБЛЮ ТЕБЯ, ПАП!», пожелание и подпись «Твой Артем». Без подсказки «листай вниз» и без кнопок.
- По уточнению пользователя от 18.10.2026: вместо гаражной двери должны открываться шторы, а фон должен быть праздничным, а не гаражом. Предыдущий гаражный эскиз больше не задаёт фон и вид занавеса; расположение надписей и последовательность сохраняются.
- Тестовый танцующий 3D-персонаж заменяется пользовательским файлом `public/models/dad.glb`.
- Пользователь согласовал световой выход на сцену: при открытии штор сначала загораются гирлянды, затем тёплый прожектор освещает папу. Свет следует за моделью при переходе к поздравлению.
- Подключена пользовательская готовая анимация из `dancedad.fbx`, преобразованная в `public/models/dad-hunyuan-dance.glb`. Сохранять исходники FBX и тестовый `dad.glb`; актуальный файл выбирается через `public/model-config.json`.
