// Конфигурация Phaser
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: true
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    orientation: Phaser.Scale.LANDSCAPE
  }
};

// Константы
const playerSpeed = 200;
const spawnDelay = 2000;
const enemySpeed = 150;
const GHOST_DELAY = 20000; // Задержка для появления привидения (20 секунд)
const LOADING_SCREEN_DURATION = 5000;

// Переменные
const game = new Phaser.Game(config);
let player;
let enemies;
let hearts;
let ghosts; // Новая группа для привидений
let score = 0;
let energy = 100;
let dustBag = 0;
let isGameOver = false;
let currentDirection = 'default';
let backgroundMusic;

// Звуки
let collectSound;
let damageSound;
let restoreSound;
let clearBagSound;
let gameOverSound;
let winSound; // Новая переменная для звука победы

// Предзагрузка ресурсов
function preload() {
  // Спрайты
  this.load.image('player', 'assets/player.png');
  this.load.image('player_up_left', 'assets/player_up_left.png');
  this.load.image('player_up_right', 'assets/player_up_right.png');
  this.load.image('player_down_left', 'assets/player_down_left.png');
  this.load.image('player_down_right', 'assets/player_down_right.png');
  this.load.image('enemy', 'assets/enemy.png');
  this.load.image('heart_small', 'assets/heart_small.png');
  this.load.image('heart_big', 'assets/heart_big.png');
  this.load.image('background1', 'assets/background1.png');
  this.load.image('background2', 'assets/background2.png');
  this.load.image('background3', 'assets/background3.png');
  this.load.image('bag', 'assets/bag.png');
  this.load.image('arrow_up_left', 'assets/arrow_up_left.png');
  this.load.image('arrow_up_right', 'assets/arrow_up_right.png');
  this.load.image('arrow_down_left', 'assets/arrow_down_left.png');
  this.load.image('arrow_down_right', 'assets/arrow_down_right.png');
  this.load.image('ghost', 'assets/ghost.png'); // Новый спрайт привидения

  // Звуки
  this.load.audio('collect_dust', 'assets/sounds/collect_dust.mp3');
  this.load.audio('damage', 'assets/sounds/damage.mp3');
  this.load.audio('restore_energy', 'assets/sounds/restore_energy.mp3');
  this.load.audio('clear_bag', 'assets/sounds/clear_bag.mp3');
  this.load.audio('game_over', 'assets/sounds/game_over.mp3');
  this.load.audio('background_music', 'assets/sounds/background_music.mp3');
  this.load.audio('win', 'assets/sounds/win.mp3'); // Загрузка звука победы
}

// Создание игры
function create() {
  // Инициализация переменных
  currentDirection = 'default';
  dustBag = 0;
  score = 0;

  // Скрытие экрана загрузки
  setTimeout(() => {
    document.getElementById('loadingScreen').style.display = 'none';
  }, LOADING_SCREEN_DURATION);

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
  player.body.setSize(70, 70).setOffset(37, 37);
  player.setScale(0.6); // 60% от оригинального размера

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
    btn.setScale(0.9); // Добавляем масштаб 60%
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
  ghosts = this.physics.add.group(); // Инициализация группы привидений

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
  this.time.addEvent({ 
    delay: GHOST_DELAY, 
    callback: spawnGhost, 
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
  winSound = this.sound.add('win'); // Инициализация звука победы
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
      
      // Добавьте эффекты здесь:
      player.setScale(0.8); // Увеличение героя
      player.setTint(0xFFFFFF); // Белое мерцание

      // Возврат к исходному размеру и цвету через 150 мс
      this.time.delayedCall(150, () => {
        player.setScale(0.6);
        player.clearTint();
      });
    }
  } else {
    energy -= 10;
    damageSound.play();
	
	    // Добавьте тряску камеры:
    this.cameras.main.shake(150, 0.01);
    
    // Или (альтернатива) мерцание героя:
    player.setTint(0xff0000);
    this.time.delayedCall(150, () => player.clearTint());
	
  }
  enemy.destroy();
  updateUI.call(this);
  checkGameOver.call(this);
});

  this.physics.overlap(player, hearts, (player, heart) => {
    energy = Math.min(energy + (heart.texture.key === 'heart_small' ? 10 : 50), 100);
    heart.destroy();
    restoreSound.play();
	
	  // Зелёное мерцание героя
  player.setTint(0x00FF00);
  this.time.delayedCall(200, () => player.clearTint());

  // Анимация исчезновения сердца (увеличение + прозрачность)
  this.tweens.add({
    targets: heart,
    scale: 1.5,
    alpha: 0,
    duration: 200,
    onComplete: () => heart.destroy()
  });


    updateUI.call(this);
  });

  // Проверка столкновений с привидениями
  this.physics.overlap(player, ghosts, (player, ghost) => {
    energy -= 50;
    damageSound.play();
	  // Эффект тряски камеры (сильнее)
  this.cameras.main.shake(300, 0.02); // 300 мс, интенсивность 0.02

  // Красное мерцание (дольше и ярче)
  player.setTint(0xff4757); // Яркий красный
  this.time.delayedCall(300, () => player.clearTint());
	
    ghost.destroy();
    updateUI.call(this);
    checkGameOver.call(this);
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

// Генерация привидения, которое летает через центр экрана
function spawnGhost() {
  // Выбираем случайное направление входа (сверху/снизу/слева/справа)
  const sides = ['top', 'bottom', 'left', 'right'];
  const entrySide = Phaser.Utils.Array.GetRandom(sides);
  
  // Вычисляем стартовую позицию в зависимости от стороны
  let startX, startY;
  switch (entrySide) {
    case 'top':
      startX = Phaser.Math.Between(0, config.width);
      startY = -50; // За верхним краем экрана
      break;
    case 'bottom':
      startX = Phaser.Math.Between(0, config.width);
      startY = config.height + 50; // За нижним краем экрана
      break;
    case 'left':
      startX = -50; // За левым краем экрана
      startY = Phaser.Math.Between(0, config.height);
      break;
    case 'right':
      startX = config.width + 50; // За правым краем экрана
      startY = Phaser.Math.Between(0, config.height);
      break;
  }

  // Создаем привидение
  const ghost = ghosts.create(startX, startY, 'ghost');
  ghost.setScale(0.5);
  ghost.body.setSize(160, 270).setOffset(0, 0);

  // Целевая точка — центр экрана
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  // Вычисляем угол между стартовой точкой и центром
  const angle = Phaser.Math.Angle.Between(startX, startY, centerX, centerY);

  // Задаем скорость в направлении центра
  this.physics.velocityFromRotation(angle, 150, ghost.body.velocity);

  // Уничтожаем привидение через 6 секунд (время полета через экран)
  this.time.delayedCall(6000, () => {
    if (ghost && ghost.active) ghost.destroy();
  });
}

// Обновление UI
function updateUI() {
  this.scoreText.setText(`Score: ${score}`);
  this.energyText.setText(`Energy: ${energy}`);
  this.bagText.setText(`Bag: ${Math.min(dustBag, 100)}%`);
}

// Проверка завершения игры
function checkGameOver() {
  if (isGameOver) return;
  if (energy <= 0 || score >= 200) {
    isGameOver = true;
    backgroundMusic.stop(); // Останавливаем фоновую музыку
    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.textContent = `Счет: ${score}`;
    if (score >= 200) {
      winSound.play(); // Воспроизвести звук победы
      document.getElementById('winScreen').style.display = 'flex';
    } else {
      gameOverSound.play();
      document.getElementById('gameOverScreen').style.display = 'flex';
    }
  }
}
