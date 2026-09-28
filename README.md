# BestB4

Have you ever had to throw away good food because you forgot its expiration date? This app can help you reduce waste.

## How to use

Tap ```+``` to add something and enter how many days it keeps. Swipe it right to start the countdown. BestB4 reminds you the day before it goes off and again on the day. Swipe right again to clear the expiration date, so it's ready for next time. Tap an item to edit it, swipe it left to delete it.

## Tech stack

This is a hybrid mobile application built using the [Ionic framework](https://ionicframework.com):

- **UI framework:** Ionic (HTML5, SASS/CSS, JavaScript/TypeScript)
- **Native runtime:** Capacitor
- **Frontend framework:** Vue

## How to build and run

To clone and test this application locally, make sure you have [Node.js](https://nodejs.org) and the Ionic CLI installed.

1. **Clone the repository:**
   ```
   git clone https://github.com/maurizuki/BestB4.git
   cd BestB4
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run in development mode (browser):**
   ```
   ionic serve
   ```

4. **Build for Android:**
   ```
   npm run build
   ionic cap sync
   ionic cap open android
   ```

## License and Open Source philosophy

This project is licensed under the [GNU General Public License v3 (GPL v3)](LICENSE).

### What does this mean?
- **Freedom to study and modify:** you are free to download, study, and modify the code for personal or educational purposes.
- **Strong copyleft (protected code):** if you redistribute this application or parts of it (even with modifications), **you are legally required to release the entire source code under the same GPL v3 license**. Using this code in proprietary or closed-source applications is strictly prohibited.

See the `LICENSE` file for the full license text.

## Author

**Maurizio Basaglia** [@maurizuki](https://github.com/maurizuki)
