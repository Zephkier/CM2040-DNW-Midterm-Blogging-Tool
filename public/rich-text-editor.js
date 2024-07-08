// From https://www.youtube.com/watch?v=la-0HOaNL10

let optionsButtons = document.querySelectorAll(".option-button");
let advancedOptionButtons = document.querySelectorAll(".adv-option-button");
let formatButtons = document.querySelectorAll(".format");
let scriptButtons = document.querySelectorAll(".script");
let alignButtons = document.querySelectorAll(".align");
let spacingButtons = document.querySelectorAll(".spacing");

let linkButton = document.getElementById("createLink");
let fontName = document.getElementById("fontName");
let fontSizeRef = document.getElementById("fontSize");
let writingArea = document.getElementById("text-input");

let fonts = [
    "Poppins",
    "Arial",
    "cursive", // Actually comic sans
    "Courier New",
    "Garamond",
    "Georgia",
    "Times New Roman",
    "Verdana",
];

/**
 * Set highlight properties to HTML classes.
 * @param {string} className HTML class' name to highlight.
 * @param {boolean} isOnlyOneHighlight Is only one button (with that `className`) allowed to be highlighted at a time?
 * - True = only one button can be highlighted at the same time.
 * - False = multiple buttons  can be highlighted at the same time.
 */
const highlightSet = (className, isOnlyOneHighlight) => {
    className.forEach((button) => {
        button.addEventListener("click", (event) => {
            // Prevent form submission when selecting buttons
            event.preventDefault();
            // When only one button can be highlighted at the same time
            if (isOnlyOneHighlight) {
                // If selected button is active, then set its boolean to make it unique
                let alreadyActive = false;
                if (button.classList.contains("active")) alreadyActive = true;
                // Remove "active" from class
                highlightRemove(className);
                // Add "active" to all except selected one
                if (!alreadyActive) button.classList.add("active");
            }
            // When multiple buttons can be highlighted at the same time
            else button.classList.toggle("active");
        });
    });
};

const highlightRemove = (className) => {
    className.forEach((button) => {
        button.classList.remove("active");
    });
};

/**
 * Executes `document.execCommand()` on the current document, current selection, or the given range.
 * @param {string} command String that specifies the command to execute.
 * @param {boolean} defaultUi Display the user interface?
 * @param {string} value Value to assign.
 */
const modifyText = (command, defaultUi, value) => {
    document.execCommand(command, defaultUi, value);
};

// optionsButtons = no value
optionsButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        // Prevent form submission when selecting buttons
        event.preventDefault();
        modifyText(button.id, false, null);
    });
});

// advancedOptionButtons = has value
advancedOptionButtons.forEach((button) => {
    button.addEventListener("change", (event) => {
        // Prevent form submission when selecting buttons
        event.preventDefault();
        modifyText(button.id, false, button.value);
    });
});

linkButton.addEventListener("click", (event) => {
    // Prevent form submission when selecting buttons
    event.preventDefault();
    let userLink = prompt("Enter URL to link:");
    // Allow links with and without "http" at the start
    if (/http/i.test(userLink)) modifyText(linkButton.id, false, userLink);
    else {
        userLink = "http://" + userLink;
        modifyText(linkButton.id, false, userLink);
    }
});

// Setup button highlights, fonts, font size
const setup = () => {
    // No highlight for list/(un)link/lists/un-redo as they are one-time operations
    highlightSet(formatButtons, false);
    highlightSet(scriptButtons, true);
    highlightSet(alignButtons, true);
    highlightSet(spacingButtons, true);
    // Fonts
    fonts.map((value) => {
        let option = document.createElement("option");
        option.value = value;
        option.innerHTML = value;
        // Rename option but in HTML's display only
        if (option.value == "Poppins") option.innerHTML = "Poppins (default)";
        if (option.value == "cursive") option.innerHTML = "Comic Sans MS";
        // Add spaces for readability
        option.innerHTML = "&nbsp;" + option.innerHTML + "&nbsp;&nbsp;&nbsp;";
        fontName.appendChild(option);
    });
    // Font size (limit is 7)
    for (let i = 1; i <= 7; i++) {
        let option = document.createElement("option");
        option.value = i;
        option.innerHTML = i;
        // Add spaces for readability
        option.innerHTML = "&nbsp;" + option.innerHTML + "&nbsp;&nbsp;&nbsp;";
        fontSizeRef.appendChild(option);
    }
    fontSizeRef.value = 3; // Default font size
};

setup();
