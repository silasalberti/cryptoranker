# Cryptoranker

Interactive visualization of the top 25 cryptocurrencies by market cap from 2013 – 2020. Check it out [here](https://cryptoranker.alberti.xyz).

![](doc/example.gif)

## Tech

Built with p5.js. Data scraped from [coinmarketcap.com](https://coinmarketcap.com) using Python and Jupyter in `Scraping.ipynb`.

## Usage

Use the slider to jump and scrub between any point from 2013 to 2020. Use the dropdowns to adjust speed and smoothness: "Speed" means how quick a day progresses. "Smoothness" means how much small fluctuations of the price are smoothed out to have a less hectic visualization.

The "Scale break" button toggles a scale break in the bar chart that cuts off the bitcoin bar, because for most of the time it exceeds the rest by a huge margin. You can always get a full picture in the pie chart or toggle it off using the aforementioned button. The "Play/Pause" button pauses or resumes the animation.
