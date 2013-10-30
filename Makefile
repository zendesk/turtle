

test:
	node test/tests.js && \
	node test/exitCodeTest.js

.PHONY: test