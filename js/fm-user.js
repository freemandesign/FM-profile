$(function() {
	$('#profile-select').change(function() {
		window.location = this.value;
	});
	$('#club-select').change(function() {
		$.post('/post/view-club', {club: this.value, person: $(this).data('person')}, function() {
			window.location.reload();
		});
	});
});
