function showImage(imageName) {

    const img = document.getElementById("scheduleImage");

    img.style.opacity = "0";

    setTimeout(() => {

        img.src = imageName;

        img.onload = () => {
            img.style.opacity = "1";
        };

    }, 250);
}


// Animación suave al cargar

window.addEventListener("load", () => {

    const img = document.getElementById("scheduleImage");

    img.style.transition = "opacity .35s ease";

});
