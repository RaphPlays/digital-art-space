(function () {
	var nav = document.querySelector(".site-nav");
	if (!nav) return;
	var currentUser = null;
	var slot = document.createElement("div"); slot.className = "auth-slot"; nav.append(slot);
	document.body.insertAdjacentHTML("beforeend",
		'<dialog class="artwork-dialog contact-dialog auth-dialog" aria-labelledby="auth-title">' +
		'<button class="dialog-close auth-close" type="button" aria-label="Close sign in">\u00d7</button>' +
		'<div class="dialog-copy"><p class="eyebrow dialog-meta">Digital Art Space</p><h2 id="auth-title">Welcome</h2>' +
		'<div class="auth-tabs" role="tablist"><button class="auth-tab" type="button" role="tab" id="tab-login" aria-selected="true" aria-controls="form-login">Sign in</button>' +
		'<button class="auth-tab" type="button" role="tab" id="tab-signup" aria-selected="false" aria-controls="form-signup">Sign up</button></div>' +
		'<form class="auth-form" id="form-login" role="tabpanel" aria-labelledby="tab-login"><label>Email<input type="email" name="email" autocomplete="email" required></label>' +
		'<label>Password<input type="password" name="password" autocomplete="current-password" required></label><button class="auth-submit" type="submit">Sign in</button></form>' +
		'<form class="auth-form" id="form-signup" role="tabpanel" aria-labelledby="tab-signup" hidden><label>Email<input type="email" name="email" autocomplete="email" required></label>' +
		'<label>Display name<input type="text" name="displayName" autocomplete="nickname" minlength="2" maxlength="80" required></label>' +
		'<label>Password<input type="password" name="password" autocomplete="new-password" minlength="8" maxlength="72" required></label><p class="auth-hint">At least 8 characters.</p>' +
		'<label class="auth-check"><input type="checkbox" name="wantsArtist"><span>I am an artist and want to apply for verification. An admin will review it.</span></label>' +
		'<button class="auth-submit" type="submit">Create account</button></form><p class="auth-message" role="status" aria-live="polite"></p></div></dialog>');
	var dialog = document.querySelector(".auth-dialog"), message = dialog.querySelector(".auth-message");
	var tabs = { login: document.getElementById("tab-login"), signup: document.getElementById("tab-signup") };
	var forms = { login: document.getElementById("form-login"), signup: document.getElementById("form-signup") };
	function setMessage(text, kind) { message.textContent = text || ""; message.className = "auth-message" + (kind ? " is-" + kind : ""); }
	function showTab(name) { Object.keys(tabs).forEach(function (key) { tabs[key].setAttribute("aria-selected", String(key === name)); forms[key].hidden = key !== name; }); setMessage(""); }
	function openDialog(tab) { showTab(tab || "login"); dialog.showModal(); }
	tabs.login.addEventListener("click", function () { showTab("login"); }); tabs.signup.addEventListener("click", function () { showTab("signup"); });
	dialog.querySelector(".auth-close").addEventListener("click", function () { dialog.close(); });
	dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
	function request(url, method, body) { return fetch(url, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body || {}) }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); }); }
	function describeRole(user) { if (user.role === "admin") return "Admin"; if (user.role === "artist" && user.artistStatus === "verified") return "Verified artist"; if (user.artistStatus === "pending") return "Artist application pending"; return "Viewer"; }
	function renderNav() {
		slot.replaceChildren();
		if (!currentUser) { var signIn = document.createElement("button"); signIn.type = "button"; signIn.className = "auth-button"; signIn.textContent = "Sign in"; signIn.addEventListener("click", function () { openDialog("login"); }); slot.append(signIn); return; }
		var who = document.createElement("span"); who.className = "auth-user"; who.textContent = currentUser.displayName;
		var role = document.createElement("small"); role.textContent = describeRole(currentUser); who.append(role);
		var logOut = document.createElement("button"); logOut.type = "button"; logOut.className = "auth-button"; logOut.textContent = "Log out";
		logOut.addEventListener("click", function () { request("/api/logout", "POST").then(function () { currentUser = null; renderNav(); document.dispatchEvent(new CustomEvent("auth:change", { detail: { user: null } })); }); });
		if (currentUser.role === "admin") { var adminLink = document.createElement("a"); adminLink.className = "auth-button"; adminLink.href = "/admin.html"; adminLink.textContent = "Admin"; slot.append(who, adminLink, logOut); }
		else if (currentUser.role === "artist" && currentUser.artistStatus === "verified") { var artistLink = document.createElement("a"); artistLink.className = "auth-button"; artistLink.href = "/artist.html"; artistLink.textContent = "Artist Studio"; slot.append(who, artistLink, logOut); }
		else slot.append(who, logOut);
	}
	function setUser(user) { currentUser = user; renderNav(); document.dispatchEvent(new CustomEvent("auth:change", { detail: { user: user } })); }
	function submitForm(form, url, buildBody, successText) {
		form.addEventListener("submit", function (event) { event.preventDefault(); var button = form.querySelector(".auth-submit"); button.disabled = true; setMessage("One moment\u2026");
			request(url, "POST", buildBody(new FormData(form))).then(function (result) { if (!result.ok) { setMessage(result.data.error || "Something went wrong. Please try again.", "error"); return; }
				setMessage(successText, "ok"); form.reset(); setUser(result.data.user); window.setTimeout(function () { dialog.close(); }, 700);
			}).catch(function () { setMessage("Cannot reach the server. Sign in only works on the live site, not when the file is opened locally.", "error"); }).then(function () { button.disabled = false; });
		});
	}
	submitForm(forms.login, "/api/login", function (data) { return { email: data.get("email"), password: data.get("password") }; }, "Signed in.");
	submitForm(forms.signup, "/api/signup", function (data) { return { email: data.get("email"), displayName: data.get("displayName"), password: data.get("password"), wantsArtist: data.get("wantsArtist") === "on" }; }, "Account created. You are signed in.");
	renderNav(); request("/api/me", "GET").then(function (result) { if (result.ok && result.data.user) setUser(result.data.user); }).catch(function () {});
	window.DigitalArtAuth = { getUser: function () { return currentUser; }, open: openDialog };
})();