# Aleena Mukeer · Portfolio

My personal site: I study Computer Science and Mathematics at the University of Northern British Columbia.

**Live:** [aleenamukeer.netlify.app](https://aleenamukeer.netlify.app/)

## What's on it

- **Home:** an illustrated version of me on a phone lock screen. She follows your cursor and waves when you tap her. The clock shows your real time, and a notification about something I've been up to shows below it, swapping every minute. The app dock links to each section.
- **Work timeline:** each job opens as a small book with photos, what I did there and a reference.
- **Projects:** robot camp games, web apps and more, with a photo gallery for each robot game.
- **Hackathons:** weekend builds, shown over a background of falling letters.
- **In the news:** press and media features.
- **Recommendations** and **Get in touch**, with a contact form.

## Built with

Plain HTML, CSS and JavaScript: no framework, no build step. The illustrated character uses WebGL, and the falling letters use a canvas. Animations follow the visitor's reduced-motion setting. Fonts are Albert Sans, Bodoni Moda and Caveat from Google Fonts. It's hosted on Netlify, and the contact form uses Netlify Forms.

## Project structure

```
index.html          all the content
404.html            the not-found page
css/styles.css      all the styles
js/site.js          sections, galleries, notifications, the hackathon background
js/character.js     the illustrated character (WebGL)
assets/             images, sorted by section (each folder has a README.txt)
```

## Running it locally

Any static file server works. From the project folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Updating content

Everything is in `index.html`, and each part has a comment explaining how to change it.

- **Placeholders:** text in `[square brackets]` is a placeholder. Whatever holds it stays hidden on the live site until you replace it.
- **Photos:** drop them into the matching `assets/` folder with the name its `README.txt` gives. Each one shows up automatically, and anything missing is skipped.
- **Phone notifications:** in `<template id="phone-notifs">`, one `<a class="notif">` per notification. Set `data-date="YYYY-MM-DD"` to the day it happened: it shows as "2d ago", or as the date after a week.
- **Hackathons and news:** add another `<article class="pcard">` to the `#hackathons` or `#news` section.
