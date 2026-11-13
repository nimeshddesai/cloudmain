(function () {
  // Links to the old single-page site (/#offerings etc.) go to the new pages.
  // A server redirect can't do this: browsers never send the part after "#".
  var oldAnchors = {
    offerings: "/services/",
    start: "/how-to-start/",
    process: "/how-to-start/#process",
    model: "/about/",
    team: "/about/#team",
    values: "/about/#values",
    faq: "/faq/",
    contact: "/contact/"
  };
  if (window.location.pathname === "/" && window.location.hash) {
    var target = oldAnchors[window.location.hash.slice(1)];
    if (target) {
      window.location.replace(target);
      return;
    }
  }

  // Hamburger menu
  var navToggle = document.getElementById("nav-toggle");
  var navLinks = document.getElementById("nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Contact form: send with fetch and show the thank-you page only after
  // Netlify confirms the submission. Without JavaScript the form still
  // posts normally on Netlify.
  var form = document.getElementById("contact-form");
  if (form && window.fetch) {
    var status = document.getElementById("form-status");
    var button = document.getElementById("contact-submit");
    var label = button.querySelector(".form-submit-label");
    var email = form.getAttribute("data-email");
    var host = window.location.hostname;
    var isLocalPreview = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || /\.localhost$/.test(host);

    var showStatus = function (kind, message) {
      status.className = "form-status form-status-" + kind;
      status.textContent = message;
      status.hidden = false;
      status.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    var setSending = function (sending) {
      button.disabled = sending;
      label.textContent = sending ? "Sending…" : "Send message";
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      status.hidden = true;

      // Netlify Forms only exists on Netlify, so a local preview has nowhere to send to
      if (isLocalPreview) {
        showStatus("notice", "Not sent: this is a local preview. The form only sends messages on the live site or a Netlify deploy preview.");
        return;
      }

      setSending(true);
      var thanksUrl = form.getAttribute("action");
      fetch(thanksUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Form submission failed with status " + response.status);
          window.location.href = thanksUrl;
        })
        .catch(function () {
          setSending(false);
          showStatus("error", "Your message could not be sent. Please try again, or email us at " + email + ".");
        });
    });
  }

  // /contact/?topic=release-reliability pre-selects that topic in the form
  var topicSelect = document.getElementById("contact-topic");
  var topic = new URLSearchParams(window.location.search).get("topic");
  if (topicSelect && topic) {
    var option = topicSelect.querySelector('option[data-slug="' + topic.replace(/[^a-z0-9-]/gi, "") + '"]');
    if (option) {
      topicSelect.value = option.value;
    }
  }
})();
