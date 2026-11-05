// Set this to the same deployed Cloudflare Worker URL as course-system.js.
const COURSE_ACCESS_API = "https://YOUR-WORKER.workers.dev";
(async function loadCourse() {
  const title = document.getElementById("course-title");
  const intro = document.getElementById("intro");
  const content = document.getElementById("course-content");
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    title.textContent = "Access link required";
    intro.textContent = "Open the private link sent to your purchase email.";
    return;
  }
  try {
    if (COURSE_ACCESS_API.includes("YOUR-WORKER")) throw new Error("The course portal is not connected yet.");
    const response = await fetch(COURSE_ACCESS_API + "/api/course?token=" + encodeURIComponent(token));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "We couldn't verify this access link.");
    title.textContent = data.course.title;
    intro.textContent = "Welcome. Your course access is active.";
    if (!data.lessons.length) {
      const notice = document.createElement("div");
      notice.className = "status";
      notice.textContent = "Your access is confirmed. Course lessons are being prepared and will appear here.";
      content.appendChild(notice);
      return;
    }
    data.lessons.forEach((lesson, index) => {
      const section = document.createElement("section");
      section.className = "lesson";
      const heading = document.createElement("h2");
      heading.textContent = (index + 1) + ". " + lesson.title;
      const paragraph = document.createElement("p");
      paragraph.textContent = lesson.content;
      section.append(heading, paragraph);
      content.appendChild(section);
    });
  } catch (error) {
    title.textContent = "We couldn't open your course";
    intro.textContent = error.message;
    const help = document.createElement("p");
    help.innerHTML = 'If you have paid, contact <a href="mailto:enzosundberg12@gmail.com">support</a> and include your purchase email.';
    content.appendChild(help);
  }
})();
