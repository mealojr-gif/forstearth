(function () {
  const likeBtn = document.getElementById("likeBtn");
  const reportBtn = document.getElementById("reportBtn");
  const copyBtn = document.getElementById("copyLinkBtn");

  function likedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem("forst_liked") || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function saveLiked(set) {
    localStorage.setItem("forst_liked", JSON.stringify([...set]));
  }

  if (likeBtn) {
    const id = likeBtn.dataset.id;
    if (likedSet().has(id)) {
      likeBtn.disabled = true;
      likeBtn.textContent = "أعجبتك هذي الصورة";
    }
    likeBtn.addEventListener("click", function () {
      if (likedSet().has(id)) return;
      fetch("/api/photo/" + id + "/like", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (!d.ok) return;
          document.getElementById("likeCount").textContent = d.likes;
          const set = likedSet();
          set.add(id);
          saveLiked(set);
          likeBtn.disabled = true;
          likeBtn.textContent = "أعجبتك هذي الصورة";
        });
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener("click", function () {
      if (!confirm("تبلغ عن هذي الصورة؟")) return;
      const id = reportBtn.dataset.id;
      fetch("/api/photo/" + id + "/report", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            reportBtn.textContent = "تم الإبلاغ";
            reportBtn.disabled = true;
          }
        });
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = "تم النسخ";
        setTimeout(() => (copyBtn.textContent = original), 1500);
      });
    });
  }
})();
