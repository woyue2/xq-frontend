# Bugfix Requirements Document

## Introduction

Users are unable to upload images due to API format mismatch between the current implementation and the imgurl.org V3 API specification. The upload fails with a 400 error "There was an error parsing the body" and subsequently returns a 500 Internal Server Error. This prevents users from adding images to questions and answers, breaking a core feature of the application.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user uploads an image file THEN the system sends a malformed request to imgurl.org V3 API resulting in a 400 error with message "There was an error parsing the body"

1.2 WHEN the imgurl.org API returns a successful response with `code: 200` THEN the system fails to parse it because it checks for `status: 200` instead, throwing "Invalid response format" error

1.3 WHEN the response parsing fails THEN the system returns a 500 Internal Server Error to the frontend with message "图片上传失败" (Image upload failed)

1.4 WHEN the frontend receives the 500 error THEN the image upload fails and users cannot add images to their content

### Expected Behavior (Correct)

2.1 WHEN a user uploads an image file THEN the system SHALL send a properly formatted multipart/form-data request to imgurl.org V3 API with correct headers (Authorization: Bearer <token>) and the file field

2.2 WHEN the imgurl.org API returns a successful response with `code: 200` THEN the system SHALL correctly parse the response by checking `result.code === 200` and extract the URL from `result.data.url`

2.3 WHEN the response is successfully parsed THEN the system SHALL return the image URL to the frontend with status 200

2.4 WHEN the frontend receives the image URL THEN the image upload SHALL complete successfully and the image SHALL be displayed in the preview

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user uploads a file that exceeds 5MB THEN the system SHALL CONTINUE TO reject it with error message "图片大小不能超过 5MB"

3.2 WHEN a user uploads a file with unsupported format THEN the system SHALL CONTINUE TO reject it with error message listing supported formats

3.3 WHEN an unauthenticated user attempts to upload THEN the system SHALL CONTINUE TO return 401 error with message "需要登录"

3.4 WHEN the OSS API returns an error response THEN the system SHALL CONTINUE TO catch the error and return a 500 error with message "图片上传失败"

3.5 WHEN an image is successfully uploaded THEN the system SHALL CONTINUE TO clean up temporary files from the server

3.6 WHEN the frontend displays uploaded images THEN it SHALL CONTINUE TO show them in the preview grid with delete buttons
