$(document).ready(function() {
    $("#housePicker").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $(".windowArea").fadeIn(200); 
    });

    $("#housePickerOKButton").click(function(e) {
        e.preventDefault();
        // Плавне зникнення
        $(".windowArea").fadeOut(200);
    });

    $(".Account").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $("#accountDropdown").fadeIn(450); 
    });

});