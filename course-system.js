// Cloudflare Worker API for Lucasahur Shop course checkout.
const COURSE_API_URL = "https://silent-hill-8e02.enzosundberg12.workers.dev";

document.querySelectorAll("[data-course-buy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const slug = button.dataset.courseBuy;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Opening secure checkout…";
    try {
      const response = await fetch(COURSE_API_URL + "/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: slug }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (error) {
      alert(error.message || "Something went wrong. Please try again.");
      button.disabled = false;
      button.textContent = original;
    }
  });
});
