
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navigation.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

// Set minimum selectable deadline to today.
const deadlineInput = document.getElementById("deadline");
deadlineInput.min = new Date().toISOString().split("T")[0];

// Service buttons preselect the matching enquiry category.
document.querySelectorAll("[data-service]").forEach(link => {
  link.addEventListener("click", () => {
    const select = document.getElementById("serviceSelect");
    const service = link.dataset.service;
    const option = [...select.options].find(item => item.text === service);
    if (option) select.value = option.value;
  });
});

const form = document.getElementById("enquiryForm");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");
const attachmentInput = document.getElementById("attachment");

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const allowedExtensions = /\.(pdf|png|jpe?g|webp|mp4|zip)$/i;

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("", "");

  const formData = new FormData(form);

  // Honeypot spam check.
  if (formData.get("website")) return;

  const file = attachmentInput.files[0];
  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      showMessage("File is larger than 3 MB. Please choose a smaller file.", "error");
      return;
    }
    if (!allowedExtensions.test(file.name)) {
      showMessage("This file type is not supported.", "error");
      return;
    }
  }

  const payload = {
    name: formData.get("name").trim(),
    email: formData.get("email").trim(),
    phone: formData.get("phone").trim(),
    service: formData.get("service"),
    title: formData.get("title").trim(),
    budget: formData.get("budget"),
    deadline: formData.get("deadline"),
    description: formData.get("description").trim(),
    links: formData.get("links").trim()
  };

  if (!payload.name || !payload.email || !payload.phone ||
      !payload.service || !payload.title || !payload.description) {
    showMessage("Please complete all required fields.", "error");
    return;
  }

  if (file) {
    try {
      payload.attachment = {
        filename: file.name,
        content: await fileToBase64(file)
      };
    } catch (error) {
      showMessage(error.message, "error");
      return;
    }
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending enquiry...";

  try {
    const response = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to send your enquiry.");
    }

    showMessage(
      "Your enquiry has been sent successfully. A confirmation email will be sent if the email service is configured correctly.",
      "success"
    );
    form.reset();
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again or contact me on WhatsApp.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send enquiry <span>↗</span>';
  }
});
