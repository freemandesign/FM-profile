$(document).on('keypress', 'input[type=integer], input[type=real]', function(e) {
	if (e.which == 0 || e.which == 8 || e.metaKey || e.ctrlKey) return; // Delete or other non-character keys
	var real = $(this).attr('type') == 'real';
	var min = $(this).attr('min');
	var negatives = min === undefined || min < 0;
	if (e.which == 45 && negatives) {
		if (this.value === '') return;
		this.value = 0 - (real ? parseFloat(this.value) : parseInt(this.value));
		$(this).change();
	}
	if (real && e.which == 46 && this.value.indexOf('.') == -1) return;
	if (e.which < 48 || e.which > 57) e.preventDefault();
}).on('change', 'input[type=integer], input[type=real]', function() {
	var real = $(this).attr('type') == 'real';
	var min = $(this).attr('min');
	var val = this.value;
	if (val !== '') {
		val = real ? parseFloat(this.value) : parseInt(this.value);
		if (isNaN(val)) val = '';
	}
	if (val === '') {
		if (min != 0) return this.value = val;
		val = 0; // On blank value with min = 0, set value to 0
	}
	var max = $(this).attr('max');
	if (min !== undefined && val < min) val = min;
	else if (max !== undefined && val > max) val = max;
	if (real) {
		var fixed = $(this).attr('fixed');
		if (fixed !== undefined) val = parseFloat(val).toFixed(fixed);
	}
	this.value = val;
});