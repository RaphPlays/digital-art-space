(function () {
	var grid = document.querySelector(".artwork-grid");
	var artistList = document.querySelector(".artist-list");
	if (!grid || !artistList) return;

	function safeUrl(url) {
		return typeof url === "string" && /^(https:\/\/[^\s"'<>]+|[A-Za-z0-9_\-\/.]+)$/.test(url) ? url : "";
	}

	function make(tag, className, text) {
		var element = document.createElement(tag);
		if (className) element.className = className;
		if (text !== undefined) element.textContent = text;
		return element;
	}

	function pad(number) {
		return number < 10 ? "0" + number : String(number);
	}

	function buildCard(work, position) {
		var card = make("button", "artwork-card" + (work.wide ? " artwork-card--wide" : ""));
		card.id = work.slug;
		card.type = "button";
		card.dataset.category = work.category;
		card.dataset.artist = work.artist;
		card.dataset.title = work.dialogTitle;
		card.dataset.meta = work.meta;
		card.dataset.description = work.description;

		var frame = make("span", "artwork-image artwork-image--" + (work.orientation === "landscape" ? "landscape" : "portrait"));
		var image = document.createElement("img");
		image.src = safeUrl(work.imageUrl);
		image.alt = work.imageAlt || "";
		image.setAttribute("loading", "lazy");
		frame.append(image);

		var index = make("span", "artwork-index", pad(position) + " / " + work.category.toUpperCase());
		var title = make("strong", "", work.cardTitle);
		var captionText = make("span");
		captionText.append(index, title);
		var mark = make("span", "open-mark", "\u2197");
		mark.setAttribute("aria-hidden", "true");
		var caption = make("span", "artwork-caption");
		caption.append(captionText, mark);

		card.append(frame, caption);
		return card;
	}

	function buildArtistRow(artist, position, works) {
		var row = make("article", "artist-row");
		row.dataset.artistId = artist.slug;

		var portrait = make("img", "artist-portrait");
		portrait.src = safeUrl(artist.portraitUrl);
		portrait.alt = artist.portraitAlt || artist.name;
		portrait.setAttribute("loading", "lazy");

		var name = make("div", "artist-name");
		name.append(make("h3", "", artist.name), make("p", "", artist.role));

		var links = make("div", "artist-works");
		links.setAttribute("aria-label", "Works in this exhibition");
		works.forEach(function (work) {
			var link = make("a", "", work.cardTitle);
			link.href = "#" + work.slug;
			links.append(link);
		});

		row.append(make("span", "artist-number", pad(position)), portrait, name, make("p", "artist-note", artist.bio), links);

		if (typeof studioContacts !== "undefined" && studioContacts[artist.slug]) {
			var arrow = make("button", "artist-arrow", "\u2197");
			arrow.type = "button";
			arrow.dataset.studio = artist.slug;
			arrow.setAttribute("aria-label", "Contact " + artist.name);
			row.append(arrow);
		} else {
			row.append(make("span"));
		}
		return row;
	}

	function render(data) {
		var works = data.artworks.filter(function (work) { return work && work.slug && work.cardTitle; });
		grid.replaceChildren.apply(grid, works.map(function (work, i) { return buildCard(work, i + 1); }));

		artistList.replaceChildren.apply(artistList, data.artists.map(function (artist, i) {
			var theirWorks = works.filter(function (work) { return work.artist === artist.slug; });
			return buildArtistRow(artist, i + 1, theirWorks);
		}));

		var buttons = document.querySelectorAll(".filter-button");
		buttons.forEach(function (button) {
			var isAll = button.dataset.filter === "all";
			button.classList.toggle("is-active", isAll);
			button.setAttribute("aria-pressed", String(isAll));
		});
		var total = document.querySelector('.filter-button[data-filter="all"] span');
		if (total) total.textContent = pad(works.length);
		var count = document.getElementById("filterCount");
		if (count) count.textContent = "Showing " + works.length + (works.length === 1 ? " work" : " works");

		var scenes = works.filter(function (work) { return typeof work.heroOrder === "number" && safeUrl(work.imageUrl); })
			.sort(function (a, b) { return a.heroOrder - b.heroOrder; })
			.map(function (work) { return { name: work.cardTitle, artwork: work.slug, imageUrl: safeUrl(work.imageUrl) }; });
		if (scenes.length > 0 && typeof setHeroScenes === "function") setHeroScenes(scenes);

		document.dispatchEvent(new CustomEvent("gallery:rendered", { detail: { artworks: works.length, artists: data.artists.length } }));
	}

	fetch("/api/gallery", { credentials: "same-origin" })
		.then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)); })
		.then(function (data) {
			if (data && Array.isArray(data.artworks) && Array.isArray(data.artists) && data.artworks.length > 0) render(data);
		})
		.catch(function () {  });
})();