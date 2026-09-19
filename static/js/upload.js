(function () {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const dropzoneEmpty = document.getElementById("dropzoneEmpty");
  const previewImg = document.getElementById("previewImg");
  const captionInput = document.getElementById("captionInput");
  const captionCount = document.getElementById("captionCount");
  const nameInput = document.getElementById("nameInput");
  const countrySelect = document.getElementById("countrySelect");
  const cityInput = document.getElementById("cityInput");
  const useMyLocation = document.getElementById("useMyLocation");
  const coordsDisplay = document.getElementById("coordsDisplay");
  const formError = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  const pickerCanvas = document.getElementById("pickerCanvas");
  const uploadSuccess = document.getElementById("uploadSuccess");
  const successLink = document.getElementById("successLink");

  // remember the uploader's name between visits (no accounts, just a
  // convenience so people don't retype it every time)
  const savedName = localStorage.getItem("forst_name");
  if (savedName) nameInput.value = savedName;

  let selectedLat = null;
  let selectedLng = null;

  function setLocation(lat, lng, label) {
    selectedLat = lat;
    selectedLng = lng;
    globe.setPin(lat, lng);
    coordsDisplay.textContent = label || (lat.toFixed(2) + ", " + lng.toFixed(2));
  }

  const globe = createGlobe(pickerCanvas, {
    autoRotate: false,
    onClick: function (e) {
      const ll = globe.pickSphere(e);
      if (ll) setLocation(ll.lat, ll.lng);
    },
  });

  // --- dropzone / file preview -----------------------------------------
  dropzone.addEventListener("click", () => fileInput.click());
  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showPreview(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) showPreview(fileInput.files[0]);
  });
  function showPreview(file) {
    const reader = new FileReader();
    reader.onload = () => {
      previewImg.src = reader.result;
      previewImg.hidden = false;
      dropzoneEmpty.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  // --- caption counter ---------------------------------------------------
  captionInput.addEventListener("input", () => {
    captionCount.textContent = captionInput.value.length;
  });

  // --- country select -> default pin -------------------------------------
  countrySelect.addEventListener("change", () => {
    const opt = countrySelect.selectedOptions[0];
    if (opt && opt.dataset.lat) {
      setLocation(parseFloat(opt.dataset.lat), parseFloat(opt.dataset.lng), opt.textContent);
    }
  });

  // --- geolocation ---------------------------------------------------------
  useMyLocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    useMyLocation.textContent = "جارٍ التحديد…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude, "موقعك الحالي");
        useMyLocation.textContent = "تم تحديد موقعك";
      },
      () => {
        useMyLocation.textContent = "تعذر تحديد الموقع";
      },
      { timeout: 8000 }
    );
  });

  // --- submit ---------------------------------------------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    formError.hidden = true;

    if (!fileInput.files.length) {
      return showError("اختر صورة أول");
    }
    if (!nameInput.value.trim()) {
      return showError("اكتب اسمك");
    }
    if (selectedLat === null || selectedLng === null) {
      return showError("حدد موقعك على الكرة أو اختر دولة");
    }

    localStorage.setItem("forst_name", nameInput.value.trim());

    const fd = new FormData();
    fd.append("image", fileInput.files[0]);
    fd.append("title", document.getElementById("titleInput").value.trim());
    fd.append("caption", captionInput.value.trim());
    fd.append("name", nameInput.value.trim());
    fd.append("country", countrySelect.value);
    fd.append("city", cityInput.value.trim());
    fd.append("lat", selectedLat);
    fd.append("lng", selectedLng);

    submitBtn.disabled = true;
    submitBtn.textContent = "جارٍ النشر…";

    fetch("/api/upload", { method: "POST", body: fd })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          showError(d.error || "صار خطأ، حاول مرة ثانية");
          submitBtn.disabled = false;
          submitBtn.textContent = "انشر على الكرة";
          return;
        }
        form.hidden = true;
        uploadSuccess.hidden = false;
        successLink.href = d.url;
      })
      .catch(() => {
        showError("تعذر الاتصال بالسيرفر");
        submitBtn.disabled = false;
        submitBtn.textContent = "انشر على الكرة";
      });
  });

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
    formError.scrollIntoView({ behavior: "smooth", block: "center" });
  }
})();
