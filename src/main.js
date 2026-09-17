import './style.css';
import { projects } from './data/projects.js';
import { buildChapters } from './chapters.js';
import { initScroll } from './scroll.js';

const chapters = buildChapters(document.getElementById('chapters'), projects);
initScroll(chapters);
