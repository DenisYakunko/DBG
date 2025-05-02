// Конфигурация Phaser
const config = {
  type: Phaser.AUTO, // Автоматический рендеринг
  width: window.innerWidth, // Ширина экрана
  height: window.innerHeight, // Высота экрана
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade', // Используем Arcade Physics
    arcade: {
      debug: false // Отключаем отладку
    }
  },
  scale: {
    mode: Phaser.Scale.FIT, // Адаптируем под экран
    autoCenter: Phaser.Scale.CENTER_BOTH, // Центрируем
    orientation: Phaser.Scale.LANDSCAPE // Ориентация
  }
};

// Константы
const playerSpeed = 200;       // Скорость движения игрока
const spawnDelay = 2000; // Задержка появления врагов
const enemySpeed = 150; // Скорость врагов
const LOADING_SCREEN_DURATION = 5000; // 4 секунды для экрана загрузки

// Переменные
const game = new Phaser.Game(config);
let player; // Игрок
let enemies; // Группа врагов
let hearts; // Группа сердец
let score = 0; // Счет
let energy = 100; // Энергия
let dustBag = 0; // Наполненность мешка
let isGameOver = false; // Состояние игры
let currentDirection = 'default'; // Направление движения
let backgroundMusic; // Фоновая музыка

// Звуки
let collectSound; // Сбор пыли
let damageSound; // Получение урона
let restoreSound; // Восстановление энергии
let clearBagSound; // Очистка мешка
let gameOverSound; // Завершение игры

// Предзагрузка ресурсов
function preload() {
  // Спрайты
  this.load.image('player', 'assets/player.png'); // Основной игрок
  this.load.image('player_up_left', 'assets/player_up_left.png'); // Направление вверх-влево
  this.load.image('player_up_right', 'assets/player_up_right.png'); // Направление вверх-вправо
  this.load.image('player_down_left', 'assets/player_down_left.png'); // Направление вниз-влево
  this.load.image('player_down_right', 'assets/player_down_right.png'); // Направление вниз-вправо
  this.load.image('enemy', 'assets/enemy.png'); // Враги
  this.load.image('heart_small', 'assets/heart_small.png'); // Маленькое сердце
  this.load.image('heart_big', 'assets/heart_big.png'); // Большое сердце
  this.load.image('background1', 'assets/background1.png'); // Фон
  this.load.image('background2', 'assets/background2.png');
  this.load.image('background3', 'assets/background3.png');
  this.load.image('bag', 'assets/bag.png'); // Мешок
  this.load.image('arrow_up_left', 'assets/arrow_up_left.png'); // Кнопка вверх-влево
  this.load.image('arrow_up_right', 'assets/arrow_up_right.png'); // Кнопка вверх-вправо
  this.load.image('arrow_down_left', 'assets/arrow_down_left.png'); // Кнопка вниз-влево
  this.load.image('arrow_down_right', 'assets/arrow_down_right.png'); // Кнопка вниз-вправо

  // Звуки
  this.load.audio('collect_dust', 'assets/sounds/collect_dust.mp3'); // Сбор пыли
  this.load.audio('damage', 'assets/sounds/damage.mp3'); // Получение урона
  this.load.audio('restore_energy', 'assets/sounds/restore_energy.mp3'); // Восстановление энергии
  this.load.audio('clear_bag', 'assets/sounds/clear_bag.mp3'); // Очистка мешка
  this.load.audio('game_over', 'assets/sounds/game_over.mp3'); // Поражение
  this.load.audio('background_music', 'assets/sounds/background_music.mp3'); // Музыка
}

// Создание игры
function create() {
  // Инициализация переменных
  currentDirection = 'default';
  dustBag = 0;
  score = 0;

  // Скрытие экрана загрузки через заданное время
  setTimeout(() => {
    document.getElementById('loadingScreen').style.display = 'none';
  }, LOADING_SCREEN_DURATION);

  // Обработчик клика по экрану загрузки
  document.getElementById('loadingScreen').addEventListener('click', () => {
    document.getElementById('loadingScreen').style.display = 'none';
  });

  // Фоновая музыка
  backgroundMusic = this.sound.add('background_music', { loop: true, volume: 0.3 });
  backgroundMusic.play();

  // Фон
  this.currentBackground = this.add.image(config.width / 2, config.height / 2, 'background1');
  this.currentBackground.setDisplaySize(config.width, config.height);

  // Игрок
  player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
  player.setCollideWorldBounds(true);
  player.body.setSize(50, 50).setOffset(37, 37);

  // Мешок для пыли
  const bag = this.add.image(config.width - 100, 50, 'bag').setInteractive();
  bag.on('pointerdown', () => {
    dustBag = 0;
    clearBagSound.play();
    updateUI.call(this);
  });

  // Виртуальные кнопки
  const buttonSize = 120;
  const createButton = (x, y, texture, direction) => {
    const btn = this.add.image(x, y, texture)
      .setInteractive()
      .setDisplaySize(buttonSize, buttonSize)
      .setAlpha(0.8);
    btn.on('pointerdown', () => setPlayerDirection.call(this, direction));
    btn.on('pointerup', () => resetPlayerDirection.call(this));
  };

  createButton(buttonSize, config.height - buttonSize * 2, 'arrow_up_left', 'up_left');
  createButton(config.width - buttonSize, config.height - buttonSize * 2, 'arrow_up_right', 'up_right');
  createButton(buttonSize, config.height - buttonSize, 'arrow_down_left', 'down_left');
  createButton(config.width - buttonSize, config.height - buttonSize, 'arrow_down_right', 'down_right');

  // Группы объектов
  enemies = this.physics.add.group();
  hearts = this.physics.add.group();

  // Таймеры
  this.time.addEvent({ 
    delay: spawnDelay, 
    callback: spawnEnemy, 
    callbackScope: this, 
    loop: true 
  });
  this.time.addEvent({ 
    delay: 15000, 
    callback: spawnHeart, 
    callbackScope: this, 
    loop: true 
  });

  // Текстовые элементы
  this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });
  this.energyText = this.add.text(10, 40, 'Energy: 100', { fontSize: '24px', fill: '#fff' });
  this.bagText = this.add.text(10, 70, 'Bag: 0%', { fontSize: '24px', fill: '#fff' });

  // Инициализация звуков
  collectSound = this.sound.add('collect_dust');
  damageSound = this.sound.add('damage');
  restoreSound = this.sound.add('restore_energy');
  clearBagSound = this.sound.add('clear_bag');
  gameOverSound = this.sound.add('game_over');
}

// Обновление игры
function update() {
  if (isGameOver) return;

  // Плавное движение игрока
  switch(currentDirection) {
    case 'up_left':
      player.setVelocity(-playerSpeed, -playerSpeed);
      break;
    case 'up_right':
      player.setVelocity(playerSpeed, -playerSpeed);
      break;
    case 'down_left':
      player.setVelocity(-playerSpeed, playerSpeed);
      break;
    case 'down_right':
      player.setVelocity(playerSpeed, playerSpeed);
      break;
    default:
      player.setVelocity(0);
  }

  // Перемещение противников
  enemies.children.iterate(enemy => {
    this.physics.moveToObject(enemy, player, enemySpeed);
  });

  // Проверка столкновений
  this.physics.overlap(player, enemies, (player, enemy) => {
    if (currentDirection === enemy.direction) {
      if (dustBag < 100) {
        score += 10;
        dustBag += 10;
        collectSound.play();
      }
    } else {
      energy -= 10;
      damageSound.play();
    }
    enemy.destroy();
    updateUI.call(this);
    checkGameOver.call(this);
  });

  this.physics.overlap(player, hearts, (player, heart) => {
    energy = Math.min(energy + (heart.texture.key === 'heart_small' ? 10 : 50), 100);
    heart.destroy();
    restoreSound.play();
    updateUI.call(this);
  });
}

// Управление направлением
function setPlayerDirection(direction) {
  currentDirection = direction;
  player.setTexture(`player_${direction}`);
}

function resetPlayerDirection() {
  currentDirection = 'default';
  player.setTexture('player');
}

// Генерация врагов
function spawnEnemy() {
  const spawnPoints = [
    { x: 0, y: 0, direction: 'up_left' },
    { x: config.width, y: 0, direction: 'up_right' },
    { x: 0, y: config.height, direction: 'down_left' },
    { x: config.width, y: config.height, direction: 'down_right' }
  ];

  const randomPoint = Phaser.Utils.Array.GetRandom(spawnPoints);
  if (!randomPoint.direction) return;

  const enemy = enemies.create(randomPoint.x, randomPoint.y, 'enemy');
  enemy.setScale(0.5);
  enemy.body.setSize(30, 30).setOffset(10, 10);
  enemy.direction = randomPoint.direction;

  const angle = Phaser.Math.Angle.Between(randomPoint.x, randomPoint.y, player.x, player.y);
  this.physics.velocityFromRotation(angle, enemySpeed, enemy.body.velocity);
}

// Генерация сердец
function spawnHeart() {
  const heartType = Phaser.Math.Between(0, 1) ? 'heart_small' : 'heart_big';
  const heart = hearts.create(
    Phaser.Math.Between(0, config.width),
    Phaser.Math.Between(0, config.height),
    heartType
  );
  heart.setScale(0.5);
  this.physics.moveToObject(heart, player, 50);
}

// Обновление UI
function updateUI() {
  this.scoreText.setText(`Score: ${score}`);
  this.energyText.setText(`Energy: ${energy}`);
  this.bagText.setText(`Bag: ${Math.min(dustBag, 100)}%`);
}

// Проверка завершения игры
function checkGameOver() {
  if (energy <= 0 || score >= 200) {
    isGameOver = true;
    gameOverSound.play();
    backgroundMusic.stop();

    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.textContent = `Счет: ${score}`;

    if (score >= 200) {
      document.getElementById('winScreen').style.display = 'flex';
    } else {
      document.getElementById('gameOverScreen').style.display = 'flex';
    }
  }
}
