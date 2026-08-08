// seedFaqs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Faq = require('./models/Faq');

// 1. Define the Hierarchical FAQ Data
// We use the `order` field to group by hardware peripheral (I2C, SPI, UART, ADC)
// and sort them logically within those groups.
const faqData = [
  // ==========================================
  // STM32 FAQs (Device Peripheral)
  // ==========================================
  
  // -- I2C Group (Order 10-19) --
  {
    peripheral: 'STM32',
    question: 'What are the default I2C1 pins?',
    answer: 'On most standard STM32 chips (like the STM32F103 Blue Pill), the default I2C1 pins are **PB6 (SCL)** and **PB7 (SDA)**.',
    tags: ['I2C', 'PB6', 'PB7', 'Clock'],
    order: 10
  },
  {
    peripheral: 'STM32',
    question: 'Can I remap the I2C1 pins to other GPIOs?',
    answer: 'Yes. I2C1 can typically be remapped to **PB8 (SCL)** and **PB9 (SDA)** using the AFIO remap register, which is useful if PB6/PB7 are clashing with a timer.',
    tags: ['I2C', 'PB8', 'PB9', 'Remap'],
    order: 11
  },

  // -- SPI Group (Order 20-29) --
  {
    peripheral: 'STM32',
    question: 'What are the default SPI1 pins?',
    answer: 'The primary SPI1 pins are **PA5 (SCK)**, **PA6 (MISO)**, and **PA7 (MOSI)**. The hardware Chip Select (NSS) is on **PA4**.',
    tags: ['SPI', 'PA5', 'PA6', 'PA7'],
    order: 20
  },

  // -- UART Group (Order 30-39) --
  {
    peripheral: 'STM32',
    question: 'Where is USART1 located for serial debugging?',
    answer: 'USART1 is connected to the APB2 bus (meaning it runs at max clock speed). The default pins are **PA9 (TX)** and **PA10 (RX)**.',
    tags: ['UART', 'USART', 'PA9', 'PA10', 'Serial'],
    order: 30
  },
  {
    peripheral: 'STM32',
    question: 'Are the USART1 pins 5V tolerant?',
    answer: 'Yes! **PA9** and **PA10** are 5V tolerant (FT) on almost all STM32 microcontrollers, making them safe to connect to 5V USB-to-TTL serial adapters.',
    tags: ['UART', 'Voltage', '5V Tolerant'],
    order: 31
  },

  // ==========================================
  // ESP32 FAQs (Device Peripheral)
  // ==========================================

  // -- I2C Group (Order 10-19) --
  {
    peripheral: 'ESP32',
    question: 'What are the default I2C pins?',
    answer: 'Unlike STM32, the ESP32 has a GPIO matrix that allows I2C to be routed to almost any pin. However, the standard default pins used by most libraries are **GPIO 22 (SCL)** and **GPIO 21 (SDA)**.',
    tags: ['I2C', 'GPIO22', 'GPIO21', 'Matrix'],
    order: 10
  },

  // -- ADC Group (Order 40-49) --
  {
    peripheral: 'ESP32',
    question: 'Which ADC pins should I use, and which should I avoid?',
    answer: 'Always use **ADC1 pins (GPIO 32 to 39)**. Avoid using ADC2 pins (GPIO 4, 0, 2, 15, 13, 12, 14, 27, 25, 26) because ADC2 is shared with the Wi-Fi driver and will fail if Wi-Fi is active.',
    tags: ['ADC', 'Analog', 'WiFi', 'Pins'],
    order: 40
  },
  
  // -- Boot/Strapping Pins (Order 50-59) --
  {
    peripheral: 'ESP32',
    question: 'Which pins cause boot failures if pulled high/low?',
    answer: 'Be extremely careful with the strapping pins: **GPIO 0, 2, 5, 12, and 15**. For example, if GPIO 12 is pulled high at boot, the flash voltage regulator outputs 1.8V instead of 3.3V, causing a crash.',
    tags: ['Boot', 'Strapping', 'Crash', 'GPIO12'],
    order: 50
  }
];

// 2. Database Connection and Seeding Logic
const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear out old FAQs to prevent duplicates if you run this multiple times
    console.log('Clearing existing FAQs...');
    await Faq.deleteMany({});

    // Insert the new data
    console.log('Inserting hierarchical FAQs...');
    await Faq.insertMany(faqData);

    console.log('✅ FAQs seeded successfully!');
    process.exit(0); // Exit script successfully
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1); // Exit with failure code
  }
};

// Execute the function
seedDatabase();