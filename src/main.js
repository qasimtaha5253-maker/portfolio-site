import './style.css';
import { projects } from './data/projects.js';
import { buildChapters } from './chapters.js';
import { buildCards } from './cards.js';
import { initScroll } from './scroll.js';

const featured = projects.filter((p) => p.featured);
const others = projects.filter((p) => !p.featured);

const chapters = buildChapters(document.getElementById('chapters'), featured);
buildCards(document.getElementById('more-projects-grid'), others);
if (!others.length) document.getElementById('more-projects').hidden = true;

initScroll(chapters);
