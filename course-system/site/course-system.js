// Set this to the deployed Cloudflare Worker URL before enabling paid checkout.
const COURSE_API_URL = "https://YOUR-WORKER.workers.dev";

document.querySelectorAll("[data-course-buy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const slug = button.dataset.courseBuy;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Opening secure checkout…";
    try {
      if (COURSE_API_URL.includes("YOUR-WORKER")) {
        throw new Error("Checkout is not connected yet. Please check back soon.");
      }
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
