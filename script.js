const languageButtons = document.querySelectorAll(".lang");
function setLanguage(language) {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-en][data-sv]").forEach((element) => {
    const value = element.dataset[language];
    if (value !== undefined) element.innerHTML = value;
  });
  languageButtons.forEach((button) => {
    const active = button.dataset.lang === language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem("lucasahur-language", language); } catch (_) {}
}
languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.lang)));
let savedLanguage = "en";
try { savedLanguage = localStorage.getItem("lucasahur-language") || "en"; } catch (_) {}
setLanguage(savedLanguage);

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
menuButton.addEventListener("click", () => {
  const open = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

document.querySelector("#contactForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const subject = encodeURIComponent("Lucasahur Shop enquiry — " + data.get("interest"));
  const body = encodeURIComponent(
    "Name: " + data.get("name") + "\nEmail: " + data.get("email") +
    "\nInterested in: " + data.get("interest") + "\n\nMessage:\n" + data.get("message")
  );
  window.location.href = "mailto:enzosundberg12@gmail.com?subject=" + subject + "&body=" + body;
});