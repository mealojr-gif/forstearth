(function () {
  const canvas = document.getElementById("globeCanvas");
  if (!canvas) return;

  const loadingEl = document.getElementById("globeLoading");
  const drawer = document.getElementById("photoDrawer");
  const drawerImg = document.getElementById("drawerImg");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerCaption = document.getElementById("drawerCaption");
  const drawerPlace = document.getElementById("drawerPlace");
  const drawerBy = document.getElementById("drawerBy");
  const drawerLikes = document.getElementById("drawerLikes");
  const drawerLikeBtn = document.getElementById("drawerLike");
  const drawerOpen = document.getElementById("drawerOpen");

  let currentPhoto = null;

  const globe = createGlobe(canvas, {
    autoRotate: true,
    onClick: function (e) {
      const data = globe.pickPoint(e);
      if (data && data.slug) openDrawer(data);
    },
  });

  function openDrawer(p) {
    currentPhoto = p;
    drawerImg.src = p.image_url;
    drawerTitle.textContent = p.title || "بدون عنوان";
    drawerCaption.textContent = p.caption || "";
    drawerPlace.textContent = [p.city, p.country_name].filter(Boolean).join(" · ");
    drawerBy.textContent = "رفعها " + (p.uploader_name || "زائر");
    drawerLikes.textContent = p.likes;
    drawerOpen.href = "/photo/" + p.slug;
    drawer.classList.add("open");
  }
  document.getElementById("drawerClose").addEventListener("click", () => drawer.classList.remove("open"));
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) drawer.classList.remove("open");
  });
  drawerLikeBtn.addEventListener("click", function () {
    if (!currentPhoto) return;
    fetch("/api/photo/" + currentPhoto.id + "/like", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          drawerLikes.textContent = d.likes;
          currentPhoto.likes = d.likes;
        }
      });
  });

  const COUNTRY_NAMES = window.FORST_COUNTRY_NAMES || {};

  fetch("/api/photos")
    .then((r) => r.json())
    .then((photos) => {
      loadingEl.style.display = "none";
      const countries = new Set();
      photos.forEach((p) => {
        p.country_name = COUNTRY_NAMES[p.country_code] || "";
        countries.add(p.country_code);
        globe.addPoint(p.lat, p.lng, p);
      });

      const statPhotos = document.getElementById("statPhotos");
      const statCountries = document.getElementById("statCountries");
      if (statPhotos) statPhotos.textContent = photos.length.toLocaleString("ar");
      if (statCountries) statCountries.textContent = countries.size.toLocaleString("ar");

      const strip = document.getElementById("latestStrip");
      if (strip) {
        strip.innerHTML = "";
        if (!photos.length) {
          strip.innerHTML = '<p class="empty-note">لسا ما فيه صور — كن أول واحد يضيف صورة.</p>';
        } else {
          photos.slice(0, 12).forEach((p) => {
            const a = document.createElement("a");
            a.className = "strip-card";
            a.href = "/photo/" + p.slug;
            a.innerHTML =
              '<img src="' + p.image_url + '" alt="" loading="lazy">' +
              '<div class="strip-meta">' + (p.title || p.country_name || "") + "</div>";
            strip.appendChild(a);
          });
        }
      }
    })
    .catch(() => {
      loadingEl.textContent = "تعذر تحميل الصور";
    });
})();
