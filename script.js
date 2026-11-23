const filterButtons = document.querySelectorAll(".filter-button");
const filterCount = document.getElementById("filterCount");
const artworkDialog = document.querySelector(".artwork-dialog");
const dialogImage = document.querySelector(".dialog-image");
const dialogTitle = document.getElementById("dialog-title");
const dialogMeta = document.querySelector(".dialog-meta");
const dialogDescription = document.querySelector(".dialog-description");
const dialogClose = document.querySelector(".dialog-close");
const dialogArtistLink = document.getElementById("dialogArtistLink");
const artistProfileDialog = document.querySelector(".artist-profile-dialog");
const artistProfileImage = document.querySelector(".artist-profile-image");
const artistProfileRole = document.querySelector(".artist-profile-role");
const artistProfileTitle = document.getElementById("artist-profile-title");
const artistProfileDescription = document.querySelector(".artist-profile-description");
const artistProfileWorks = document.querySelector(".artist-profile-works");
const artistProfileClose = document.querySelector(".artist-profile-close");
const contactDialog = document.querySelector(".contact-dialog");
const contactDialogTitle = document.getElementById("contact-dialog-title");
const contactDialogNote = document.querySelector(".contact-dialog-note");
const contactDialogLinks = document.querySelector(".contact-dialog-links");
const contactDialogClose = document.querySelector(".contact-dialog-close");

const studioContacts = {
	bungie: {
		name: "Bungie",
		note: "Bungie publishes this address for media and influencer inquiries only. For other inquiries, use Bungie's official site.",
		links: [
			{ label: "Official website", value: "bungie.net", href: "https://www.bungie.net/" },
			{ label: "Instagram", value: "@bungie", href: "https://www.instagram.com/bungie/" },
			{ label: "Facebook", value: "Bungie", href: "https://www.facebook.com/Bungie" },
			{ label: "Press email", value: "press@bungie.com", href: "mailto:press@bungie.com" },
			{ label: "Bungie Press Room", value: "Official contact page", href: "https://press.bungie.com/Site/Contact" }
		]
	},
	sunrise: {
		name: "Sunrise / Bandai Namco Filmworks",
		note: "The official site directs general and business inquiries to its contact forms.",
		links: [
			{ label: "Official website", value: "sunrise-inc.co.jp", href: "https://www.sunrise-inc.co.jp/" },
			{ label: "Instagram", value: "@bandainamcofilmworks_en", href: "https://www.instagram.com/bandainamcofilmworks_en/" },
			{ label: "Facebook", value: "Bandai Namco Filmworks English", href: "https://www.facebook.com/BandaiNamcoFilmworksEnglish/" },
			{ label: "Official inquiries", value: "Bandai Namco Filmworks contact page", href: "https://www.bnfw.co.jp/contact/" },
			{ label: "Works and licensing support", value: "Official inquiry form", href: "https://support.bnfw.co.jp/support/contact/works" }
		]
	},
	"square-enix": {
		name: "Square Enix",
		note: "The number below is Square Enix Holdings' Tokyo headquarters switchboard. Corporate and product inquiries have separate official channels.",
		links: [
			{ label: "Official website", value: "square-enix-games.com", href: "https://www.square-enix-games.com/en_US/home" },
			{ label: "Instagram", value: "@squareenix", href: "https://www.instagram.com/squareenix/" },
			{ label: "Facebook", value: "Square Enix", href: "https://www.facebook.com/SquareEnix" },
			{ label: "Headquarters phone", value: "+81-3-5292-8000", href: "tel:+81352928000" },
			{ label: "Corporate inquiry", value: "Official contact form", href: "https://www.hd.square-enix.com/eng/contact.html" },
			{ label: "Product support", value: "Choose your region", href: "https://support.na.square-enix.com/" }
		]
	},
	riot: {
		name: "Riot Games",
		note: "Riot publishes this address for media inquiries only.",
		links: [
			{ label: "Official website", value: "riotgames.com", href: "https://www.riotgames.com/en" },
			{ label: "Instagram", value: "@riotgames", href: "https://www.instagram.com/riotgames/" },
			{ label: "Facebook", value: "Riot Games", href: "https://www.facebook.com/RiotGames/" },
			{ label: "Press email", value: "media@riotgames.com", href: "mailto:media@riotgames.com" },
			{ label: "Riot Games Press", value: "Official press page", href: "https://www.riotgames.com/en/press" }
		]
	},
	"cd-projekt-red": {
		name: "CD Projekt Red",
		note: "Official CD Projekt Red site and social media. The press address is for media inquiries; business inquiries have a separate address.",
		links: [
			{ label: "Official website", value: "cdprojektred.com", href: "https://www.cdprojektred.com/en" },
			{ label: "Instagram", value: "@cdprojektred", href: "https://www.instagram.com/cdprojektred/" },
			{ label: "Facebook", value: "CD PROJEKT RED", href: "https://www.facebook.com/CDPROJEKTRED/" },
			{ label: "Press and content creators", value: "media@cdprojektred.com", href: "mailto:media@cdprojektred.com" },
			{ label: "Business inquiries", value: "biz@cdprojektred.com", href: "mailto:biz@cdprojektred.com" }
		]
	}
};

function getArtistRow(artistId) {
	return Array.from(document.querySelectorAll(".artist-row")).find(function (row) {
		return row.dataset.artistId === artistId;
	}) || null;
}

function showArtistProfile(artistId) {
	const row = getArtistRow(artistId);
	if (!row) return;

	const portrait = row.querySelector(".artist-portrait");
	artistProfileImage.src = portrait.src;
	artistProfileImage.alt = portrait.alt;
	artistProfileRole.textContent = row.querySelector(".artist-name p").textContent;
	artistProfileTitle.textContent = row.querySelector(".artist-name h3").textContent;
	artistProfileDescription.textContent = row.querySelector(".artist-note").textContent;
	artistProfileWorks.replaceChildren();

	row.querySelectorAll(".artist-works a").forEach(function (workLink) {
		const workButton = document.createElement("button");
		workButton.className = "artist-profile-work";
		workButton.type = "button";
		workButton.textContent = workLink.textContent;
		workButton.addEventListener("click", function () {
			artistProfileDialog.close();
			const artworkCard = document.getElementById(workLink.getAttribute("href").slice(1));
			if (artworkCard) artworkCard.click();
		});
		artistProfileWorks.append(workButton);
	});

	artistProfileDialog.showModal();
}

document.addEventListener("click", function (event) {
	const button = event.target.closest(".artist-arrow");
	if (button) {
		const studio = studioContacts[button.dataset.studio];
		if (!studio) return;

		contactDialogTitle.textContent = studio.name;
		contactDialogNote.textContent = studio.note;
		contactDialogLinks.replaceChildren();
		studio.links.forEach(function (contact) {
			const link = document.createElement("a");
			link.href = contact.href;
			if (contact.href.startsWith("https://")) {
				link.target = "_blank";
				link.rel = "noopener noreferrer";
			}
			const label = document.createElement("span");
			label.textContent = contact.label;
			const value = document.createElement("span");
			value.textContent = contact.value + " ↗";
			link.append(label, value);
			contactDialogLinks.append(link);
		});
		contactDialog.showModal();
	}
});

contactDialogClose.addEventListener("click", function () {
	contactDialog.close();
});

contactDialog.addEventListener("click", function (event) {
	if (event.target === contactDialog) contactDialog.close();
});

filterButtons.forEach(function (button) {
	button.addEventListener("click", function () {
		const selectedFilter = button.dataset.filter;
		let visibleCount = 0;

		filterButtons.forEach(function (filterButton) {
			const isActive = filterButton === button;
			filterButton.classList.toggle("is-active", isActive);
			filterButton.setAttribute("aria-pressed", String(isActive));
		});

		document.querySelectorAll(".artwork-card").forEach(function (card) {
			const isVisible = selectedFilter === "all" || card.dataset.category === selectedFilter;
			card.hidden = !isVisible;
			if (isVisible) visibleCount += 1;
		});

		filterCount.textContent = "Showing " + visibleCount + (visibleCount === 1 ? " work" : " works");
	});
});

function showArtworkCard(card) {
	const image = card.querySelector("img");
	dialogImage.src = image.src;
	dialogImage.alt = image.alt;
	dialogTitle.textContent = card.dataset.title;
	dialogMeta.textContent = card.dataset.meta;
	dialogDescription.textContent = card.dataset.description;
	const artistId = card.dataset.artist;
	const artistRow = getArtistRow(artistId);
	dialogArtistLink.textContent = artistRow ? artistRow.querySelector(".artist-name h3").textContent : "Unknown artist";
	dialogArtistLink.dataset.artistId = artistId || "";
	dialogArtistLink.disabled = !artistRow;
	artworkDialog.showModal();
}

document.addEventListener("click", function (event) {
	const card = event.target.closest(".artwork-card");
	if (card) showArtworkCard(card);
});

dialogArtistLink.addEventListener("click", function () {
	const artistId = dialogArtistLink.dataset.artistId;
	artworkDialog.close();
	showArtistProfile(artistId);
});

document.addEventListener("click", function (event) {
	const link = event.target.closest(".artist-works a");
	if (!link) return;
	event.preventDefault();
	const artworkCard = document.getElementById(link.getAttribute("href").slice(1));
	if (artworkCard) artworkCard.click();
});

dialogClose.addEventListener("click", function () {
	artworkDialog.close();
});

artworkDialog.addEventListener("click", function (event) {
	if (event.target === artworkDialog) artworkDialog.close();
});

artistProfileClose.addEventListener("click", function () {
	artistProfileDialog.close();
});

artistProfileDialog.addEventListener("click", function (event) {
	if (event.target === artistProfileDialog) artistProfileDialog.close();
});

const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
const heroIndicators = Array.from(document.querySelectorAll(".hero-indicator"));
const heroControls = document.querySelector(".hero-controls");
const heroCaption = document.getElementById("heroCaption");
const heroPrevious = document.getElementById("heroPrevious");
const heroNext = document.getElementById("heroNext");
const heroSceneLink = document.getElementById("heroSceneLink");
const heroNames = ["Night City", "Japantown"];
const heroArtworkIds = ["night-city", "japantown"];
let activeHeroSlide = 0;
let heroTimer;

function updateHeroArtworkLink(index) {
	const title = heroNames[index];
	heroSceneLink.href = "#" + heroArtworkIds[index];
	heroSceneLink.setAttribute("aria-label", "Open " + title + " artwork details");
}

function showHeroSlide(index) {
	const slideCount = heroSlides.filter(function (slide) {
		return !slide.hidden;
	}).length;
	if (slideCount < 2) return;

	activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
	heroSlides.forEach(function (slide, slideIndex) {
		const isActive = slideIndex === activeHeroSlide && !slide.hidden;
		slide.classList.toggle("is-active", isActive);
	});
	heroIndicators.forEach(function (indicator, slideIndex) {
		const isActive = slideIndex === activeHeroSlide && !heroSlides[slideIndex].hidden;
		indicator.classList.toggle("is-active", isActive);
		indicator.setAttribute("aria-pressed", String(isActive));
	});
	heroCaption.textContent = heroNames[activeHeroSlide];
	updateHeroArtworkLink(activeHeroSlide);
}

heroSceneLink.addEventListener("click", function (event) {
	event.preventDefault();
	const artworkCard = document.getElementById(heroArtworkIds[activeHeroSlide]);
	if (artworkCard) showArtworkCard(artworkCard);
});

function startHeroTimer() {
	window.clearInterval(heroTimer);
	const availableSlides = heroSlides.filter(function (slide) { return !slide.hidden; }).length;
	heroControls.hidden = availableSlides < 2;
	if (availableSlides > 1) {
		heroTimer = window.setInterval(function () {
			showHeroSlide(activeHeroSlide + 1);
		}, 7000);
	}
}

heroSlides.forEach(function (slide, index) {
	slide.addEventListener("error", function () {
		slide.hidden = true;
		heroIndicators[index].hidden = true;
		const availableIndex = heroSlides.findIndex(function (item) { return !item.hidden; });
		if (availableIndex >= 0) {
			activeHeroSlide = availableIndex;
			heroSlides[availableIndex].classList.add("is-active");
			heroCaption.textContent = heroNames[availableIndex];
			updateHeroArtworkLink(availableIndex);
		}
		startHeroTimer();
	});
	if (slide.complete && slide.naturalWidth === 0) {
		slide.dispatchEvent(new Event("error"));
	}
});

heroIndicators.forEach(function (indicator) {
	indicator.addEventListener("click", function () {
		showHeroSlide(Number(indicator.dataset.slideTo));
		startHeroTimer();
	});
});

heroPrevious.addEventListener("click", function () {
	showHeroSlide(activeHeroSlide - 1);
	startHeroTimer();
});

heroNext.addEventListener("click", function () {
	showHeroSlide(activeHeroSlide + 1);
	startHeroTimer();
});

updateHeroArtworkLink(activeHeroSlide);
startHeroTimer();