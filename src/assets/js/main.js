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
