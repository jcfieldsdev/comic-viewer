/******************************************************************************
 * Comic Viewer                                                               *
 *                                                                            *
 * Copyright (C) 2021 J.C. Fields (jcfields@jcfields.dev).                    *
 *                                                                            *
 * Permission to use, copy, modify, and/or distribute this software for any   *
 * purpose with or without fee is hereby granted, provided that the above     *
 * copyright notice and this permission notice appear in all copies.          *
 *                                                                            *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES   *
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF           *
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR    *
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES     *
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN      *
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR *
 * IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.                *
 ******************************************************************************/

"use strict";

// time before controls automatically close
const FADE_DELAY = 3000;
// time before controls can be reopened after closing gallery
const CLOSE_DELAY = 250;

// cover page title for alt text
const COVER_TITLE = "Cover Page";

const STORAGE_NAME = "comic";
const IMAGE_DIR = "../../comics";
const INFO_FILE = "info.json";

// image name patterns:
// use hashes in place of page number,
// number gets zero-padded to length of hashes
const PAGE_PATTERN = "page-##";
const THUMB_PATTERN = "thumb-##";

/*
 * initialization
 */

window.addEventListener("load", function() {
	const store = new Storage(STORAGE_NAME);
	const comic = new Comic();
	const viewer = new Viewer();

	// tries to get comic ID from query string,
	// otherwise uses last segment of virtual path
	const saved = store.load() ?? {};
	const id = getParams().get("id") ?? getIdFromPath() ?? "";
	const pg = getHash() ?? saved[id] ?? 0;

	if (id != "") {
		comic.open(id).then(function() {
			comic.jumpToPage(Number(pg));
			viewer.open(comic);
			viewer.changePage();
		}).catch(viewer.displayError.bind(viewer));
	} else {
		viewer.displayError("No comic specified.");
	}

	window.addEventListener("beforeunload", function() {
		if (comic.length > 0) { // only saves if comic opened successfully
			saved[comic.id] = comic.current;
			store.save(saved);
		}
	});
	window.addEventListener("hashchange", function() {
		// changes on link or browser back/forward
		comic.jumpToPage(getHash());
		viewer.changePage();
	});
	window.addEventListener("fullscreenchange", function() {
		viewer.toggleEnterExit();
	});
	window.addEventListener("keydown", function(event) {
		const {key} = event;

		if (key == "Alt") {
			viewer.toggleFirstLast();
		}
	});
	window.addEventListener("keyup", function(event) {
		const {key, code} = event;

		if (key == "Alt") {
			viewer.toggleFirstLast();
		}

		if (code == "ArrowLeft") {
			comic.previous();
			viewer.changePage();
		}

		if (code == "ArrowRight") {
			comic.next();
			viewer.changePage();
			viewer.closeSections();
		}

		if (code == "KeyF") {
			viewer.fullscreen();
		}

		if (code == "KeyG") {
			viewer.toggleGallery();
		}
	});

	document.addEventListener("click", function(event) {
		const element = event.target;

		if (element.matches("#enter, #exit")) {
			viewer.fullscreen();
		}

		if (element.matches("#first")) {
			comic.first();
			viewer.changePage();
		}

		if (element.matches("#allpages")) {
			viewer.openGallery();
		}

		if (element.matches("#last")) {
			comic.last();
			viewer.changePage();
			viewer.closeSections();
		}

		if (element.matches("#previous")) {
			comic.previous();
			viewer.changePage();
		}

		if (element.matches("#next")) {
			comic.next();
			viewer.changePage();
			viewer.closeSections();
		}

		if (element.closest("#page")) {
			viewer.closeGallery();
		}

		if (element.matches("#back")) {
			viewer.closeGallery();
			viewer.openControls();
		}

		if (element.closest(".page")) {
			comic.jumpToPage(Number(element.closest(".page").value));
			viewer.changePage();
			viewer.closeGallery();
		}

		if (element.matches(".section")) {
			comic.jumpToSection(Number(element.value));
			viewer.changePage();
			viewer.closeSections();
		}
	});
	document.addEventListener("click", viewer.popUpOverlays.bind(viewer));
	document.addEventListener("mousemove", viewer.popUpOverlays.bind(viewer));

	function getHash() {
		if (window.location.hash.length > 1) {
			return Number(window.location.hash.substring(1)); // chops initial #
		}
	}

	function getParams() {
		return new URL(window.location.href).searchParams;
	}

	function getIdFromPath() {
		const path = window.location.pathname.split("/");
		// takes last element or tries again if last element is an empty string
		// (which is the case when the path ends with a slash)
		return path.pop() || path.pop();
	}
});

function $(selector) {
	return document.querySelector(selector);
}

function $$(selector) {
	return Array.from(document.querySelectorAll(selector));
}

/*
 * Viewer prototype
 */

function Viewer() {
	this.comic = null;

	this.timer = null;
	this.visible = false;
}

Viewer.prototype.open = function(comic) {
	this.comic = comic;

	document.title = comic.title;
	$("#progress").setAttribute("max", comic.length);

	this.populateGallery();
	this.populateSections();

	// sets visibility of two-state buttons
	this.toggleEnterExit();
	this.toggleFirstLast();
};

Viewer.prototype.changePage = function() {
	if (this.comic == null) {
		return;
	}

	const n = this.comic.current;
	const alt = n == 0 ? COVER_TITLE : `Page ${n}`;

	$("#loading").classList.add("open");

	const img = new Image();
	img.src = this.comic.getPage(n);
	img.addEventListener("load", function() {
		$("#loading").classList.remove("open");

		const element = $("#page img");
		element.src = this.src;
		element.setAttribute("alt", alt);
	});

	$("#progress").value = n;
	$("#current").textContent = alt;

	const isFirstPage = n == 0;
	$("#first").disabled = isFirstPage;
	$("#previous").disabled = isFirstPage;

	const isLastPage = n == this.comic.length;
	$("#last").disabled = isLastPage;
	$("#next").disabled = isLastPage;

	window.location.hash = "#" + n;
};

Viewer.prototype.popUpOverlays = function() {
	if (!this.visible) { // other overlay is already visible
		this.openControls();
		this.openFullscreen();
		this.openSections();

		// hides overlays after delay, resets timer each time function is called
		window.clearTimeout(this.timer);
		this.timer = window.setTimeout(function() {
			this.closeControls();
			this.closeFullscreen();
			this.closeSections();
		}.bind(this), FADE_DELAY);
	}
};

Viewer.prototype.openControls = function() {
	$("#controls").classList.add("open");
};

Viewer.prototype.closeControls = function() {
	$("#controls").classList.remove("open");
};

Viewer.prototype.openFullscreen = function() {
	if (document.fullscreenEnabled) {
		$("#fullscreen").classList.add("open");
	}
};

Viewer.prototype.closeFullscreen = function() {
	if (document.fullscreenEnabled) {
		$("#fullscreen").classList.remove("open");
	}
};

Viewer.prototype.openGallery = function() {
	this.closeControls();
	this.closeFullscreen();
	this.closeSections();

	$("#gallery").classList.add("open");
	this.visible = true;

	// blurs thumbnails after current page to obscure spoilers
	for (const element of $$(".page img")) {
		const value = Number(element.closest("button").value);
		element.classList.toggle("hidden", this.comic.current < value);
	}
};

Viewer.prototype.closeGallery = function() {
	$("#gallery").classList.remove("open");

	window.setTimeout(function() {
		this.visible = false;
	}.bind(this), CLOSE_DELAY);
};

Viewer.prototype.toggleGallery = function() {
	if ($("#gallery").classList.contains("open")) {
		this.closeGallery();
	} else {
		this.openGallery();
	}
};

Viewer.prototype.populateGallery = function() {
	const div = document.createElement("div");
	div.id = "gallery";
	div.className = "overlay";

	const button = document.createElement("button");
	button.id = "back";
	button.setAttribute("type", "button");
	div.appendChild(button);

	for (let i = 0; i <= this.comic.length; i++) {
		const button = document.createElement("button");
		button.className = "page";
		button.value = i;
		button.setAttribute("type", "button");

		const img = new Image();
		img.src = this.comic.getThumb(i);
		img.setAttribute("alt", i == 0 ? COVER_TITLE : `Page ${i}`);
		img.setAttribute("loading", "lazy");

		button.appendChild(img);
		button.appendChild(document.createTextNode(i));
		div.appendChild(button);
	}

	$("#gallery").replaceWith(div);
};

Viewer.prototype.openSections = function() {
	if (this.comic == null) {
		return;
	}

	if (this.comic.current == 0 && this.comic.sections != undefined) {
		$("#sections").classList.add("open");
	}
};

Viewer.prototype.closeSections = function() {
	$("#sections").classList.remove("open");
};

Viewer.prototype.populateSections = function() {
	if (this.comic.sections.length == 0) {
		return;
	}

	const div = document.createElement("div");
	div.id = "sections";
	div.className = "overlay";

	for (let i = 0; i < this.comic.sections.length; i++) {
		const button = document.createElement("button");
		button.className = "section";
		button.value = i;
		button.textContent = "Part " + convertToRomanNumeral(i + 1);
		button.setAttribute("type", "button");
		div.appendChild(button);
	}

	$("#sections").replaceWith(div);

	function convertToRomanNumeral(num) {
		const TABLE = {
			M: 1000, CM: 900,
			D: 500,  CD: 400,
			C: 100,  XC: 90,
			L: 50,   XL: 40,
			X: 10,   IX: 9,
			V: 5,    IV: 4,
			I: 1
		};
		let result = "";

		for (const [key, value] of Object.entries(TABLE)) {
			while (num >= value) {
				result += key;
				num -= value;
			}
		}

		return result;
	}
};

Viewer.prototype.toggleEnterExit = function() {
	const state = !$("#exit").hidden;

	$("#enter").hidden = !state;
	$("#exit").hidden = state;
};

Viewer.prototype.toggleFirstLast = function() {
	const state = !$("#last").hidden;

	$("#first").hidden = !state;
	$("#last").hidden = state;
};

Viewer.prototype.displayError = function(message) {
	$("#error").classList.add("open");
	$("#error p").textContent = message;
	this.visible = true;
};

Viewer.prototype.fullscreen = function() {
	if (document.fullscreenElement == null) {
		document.documentElement.requestFullscreen();
	} else {
		document.exitFullscreen();
	}
};

/*
 * Comic prototype
 */

function Comic() {
	this.id = "";

	this.title = "";
	this.extension = "";
	this.sections = [];

	this.current = 0;
	this.length = 0;
}

Comic.prototype.open = function(id) {
	const url = [IMAGE_DIR, id, INFO_FILE].join("/");

	return window.fetch(url).then(function(response) {
		return response.json();
	}).then(function({title, extension, length, sections}) {
		this.id = id;

		this.title     = title     ?? "";
		this.extension = extension ?? "";
		this.length    = length    ?? 0;
		this.sections  = sections  ?? [];
	}.bind(this)).catch(function(error) {
		throw `Could not open the comic “${id}.”`;
	});
};

Comic.prototype.getPage = function(n) {
	const count = PAGE_PATTERN.match(/#+/).pop().length;
	const page = PAGE_PATTERN.replace(/#+/, n.toString().padStart(count, "0"));
	const fileName = [page, this.extension].join(".");

	return [IMAGE_DIR, this.id, fileName].join("/");
};

Comic.prototype.getThumb = function(n) {
	const count = THUMB_PATTERN.match(/#+/).pop().length;
	const page = THUMB_PATTERN.replace(/#+/, n.toString().padStart(count, "0"));
	const fileName = [page, this.extension].join(".");

	return [IMAGE_DIR, this.id, fileName].join("/");
};

Comic.prototype.jumpToPage = function(n) {
	this.current = n;
};

Comic.prototype.jumpToSection = function(n) {
	if (n < this.sections.length) {
		this.current = this.sections[n];
	}
};

Comic.prototype.first = function() {
	this.current = 0;
};

Comic.prototype.last = function() {
	this.current = this.length;
};

Comic.prototype.previous = function() {
	if (this.current > 0) {
		this.current--;
	}
};

Comic.prototype.next = function() {
	if (this.current < this.length) {
		this.current++;
	}
};

/*
 * Storage prototype
 */

function Storage(name) {
	this.name = name;
}

Storage.prototype.load = function() {
	try {
		const contents = localStorage.getItem(this.name);

		if (contents != null) {
			return JSON.parse(contents);
		}
	} catch (err) {
		console.error(err);
		this.reset();
		return null;
	}
};

Storage.prototype.save = function(list) {
	try {
		if (Object.keys(list).length > 0) {
			localStorage.setItem(this.name, JSON.stringify(list));
		} else {
			this.reset();
		}
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.reset = function() {
	try {
		localStorage.removeItem(this.name);
	} catch (err) {
		console.error(err);
	}
};