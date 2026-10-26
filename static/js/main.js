/* Hospital Management System – Client-Side Form Validation & Interactivity */

document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------------------------------------------------
    // 1. Set dynamic min attribute for future date inputs (Appointment Booking)
    // -----------------------------------------------------------------------
    const todayStr = new Date().toISOString().split("T")[0];
    const appointmentDateInputs = document.querySelectorAll(
        'input[type="date"][name="appointment_date"], input[type="date"][data-future-only="true"]'
    );
    appointmentDateInputs.forEach((input) => {
        input.setAttribute("min", todayStr);
        input.addEventListener("change", () => {
            if (input.value && input.value < todayStr) {
                input.setCustomValidity("Appointment date cannot be in the past.");
            } else {
                input.setCustomValidity("");
            }
        });
    });

    // -----------------------------------------------------------------------
    // 2. Strict Bootstrap 5 Form Validation Matching Backend Rules
    // -----------------------------------------------------------------------
    const forms = document.querySelectorAll(".needs-validation");

    Array.from(forms).forEach((form) => {
        // Real-time password confirmation match check
        const passwordInput = form.querySelector('input[name="password"]');
        const confirmPasswordInput = form.querySelector('input[name="confirm_password"]');

        if (passwordInput && confirmPasswordInput) {
            const validatePasswordMatch = () => {
                if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity("Passwords do not match.");
                    const feedback = confirmPasswordInput.parentElement.querySelector(".invalid-feedback");
                    if (feedback) feedback.textContent = "Passwords do not match.";
                } else {
                    confirmPasswordInput.setCustomValidity("");
                }
            };
            passwordInput.addEventListener("input", validatePasswordMatch);
            confirmPasswordInput.addEventListener("input", validatePasswordMatch);
        }

        // Live input validation to clear/show errors dynamically
        const inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach((input) => {
            input.addEventListener("input", () => {
                if (form.classList.contains("was-validated")) {
                    if (input.checkValidity()) {
                        input.classList.remove("is-invalid");
                    } else {
                        input.classList.add("is-invalid");
                    }
                }
            });
            input.addEventListener("change", () => {
                if (form.classList.contains("was-validated")) {
                    if (input.checkValidity()) {
                        input.classList.remove("is-invalid");
                    } else {
                        input.classList.add("is-invalid");
                    }
                }
            });
        });

        // Doctor Availability Form special validation
        const availabilityRows = form.querySelectorAll("tr[data-day]");
        if (availabilityRows.length > 0) {
            availabilityRows.forEach((row) => {
                const check = row.querySelector('input[type="checkbox"]');
                const start = row.querySelector('input[name$="_start"]');
                const end = row.querySelector('input[name$="_end"]');

                if (check && start && end) {
                    const toggleTimeInputs = () => {
                        if (check.checked) {
                            start.required = true;
                            end.required = true;
                        } else {
                            start.required = false;
                            end.required = false;
                            start.setCustomValidity("");
                            end.setCustomValidity("");
                        }
                    };
                    check.addEventListener("change", toggleTimeInputs);
                    toggleTimeInputs();

                    const validateTimes = () => {
                        if (check.checked && start.value && end.value) {
                            if (start.value >= end.value) {
                                end.setCustomValidity("End time must be after start time.");
                            } else {
                                end.setCustomValidity("");
                            }
                        }
                    };
                    start.addEventListener("change", validateTimes);
                    end.addEventListener("change", validateTimes);
                }
            });
        }

        // Form Submit Handler
        form.addEventListener("submit", (event) => {
            // Re-check password match
            if (passwordInput && confirmPasswordInput) {
                if (passwordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity("Passwords do not match.");
                } else {
                    confirmPasswordInput.setCustomValidity("");
                }
            }

            // Re-check appointment date
            const dateInput = form.querySelector('input[name="appointment_date"]');
            if (dateInput && dateInput.value && dateInput.value < todayStr) {
                dateInput.setCustomValidity("Appointment date cannot be in the past.");
            }

            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();

                // Focus first invalid element
                const firstInvalid = form.querySelector(":invalid");
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }

            form.classList.add("was-validated");
        });
    });
});
