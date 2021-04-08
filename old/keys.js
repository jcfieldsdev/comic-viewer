"use strict";

window.addEventListener("keyup", function(event) {
	if (event.keyCode == 37) { // left arrow
		redir(false);
	}

	if (event.keyCode == 39) { // right arrow
		redir(true);
	}

	function redir(dir) {
		const div = document.getElementById(dir ? "next" : "prev");

		if (div != null) {
			window.location = div.getElementsByTagName("a")[0].href;
		}
	}
});