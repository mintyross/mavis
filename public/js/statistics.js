$(document).ready(function() {
    $("#resourceUsageForm").on("submit", function(e) {
        e.preventDefault();
        
        /* метод .serialize() автоматично знайде всі інпути за їхніми атрибутами name */
        const serializedData = $(this).serialize();
        console.log("Sending resource payload:", serializedData);
        
        $.ajax({
            type: "POST",
            url: "/resourceUsage", // CHANGE THIS from '/statistics' back to '/resourceUsage'
            data: serializedData,
            dataType: "json",
            success: function(response) {
                if (response.success) {
                    $("#resourceUsageForm")[0].reset();
                }
            },
            error: function(xhr) {
                console.error("Error sending the resource usage data:", xhr.responseText);
                alert("Error sending the resource usage data.");
            }
        });
    });
});