When assessing issue quality, use the following guidance to determine where users should be directed:

- **🐞 [Bug Report](https://github.com/thoukydides/homebridge-homeconnect/issues/new?template=bug_report.yml)** issue template with `bug` label
  - Bug reports **must** use the Bug Report template; it collects essential diagnostic information (version, logs, device details) required to resolve most issues
  - Close the issue and ask the user to refile if they are clearly reporting a bug but have not used the Bug Report template

- **🚧 [Feature Request](https://github.com/thoukydides/homebridge-homeconnect/issues/new?template=feature_request.yml)** issue template with `enhancement` label
  - Feature request should use the Feature Request template, but this is less critical than for bug reports
  - If the request is clear, and not combined with other issues, then the issue can be left open even if a different template was used

- **🚫 HomeConnect API unexpected values** issue template with `api keys/values` label
  - The plugin log may provide a link to create an issue of this type when it receives an unrecognised value from the Home Connect API
  - This template should **never** be used to manually raise issues under any other circumstances

- **💬 [Discussions](https://github.com/thoukydides/homebridge-homeconnect/discussions)**
  - Discussions are preferred for general questions/support or for early-stage feature ideas ("How do I...?", "Why does...?", "Can you explain...?")
  - Can leave the issue open with gentle guidance to use Discussions next time

- **🤖 [Ask Dosu](https://github.dosu.com/thoukydides/homebridge-homeconnect)**
  - The Dosu AI assistant has been trained on this project's source code, Wiki, and previous issues (plus other relevant background knowledge)
  - For any support issues that are unlikely to require changes to the project implementation suggest that asking Dosu could result in a quicker answer (requires a free https://dosu.dev/ account)

- **📧 [Contact the Home Connect Developer team](https://developer.home-connect.com/support/contact)**
  - The functionality of this plugin is constrained by the capabilities of the Home Connect API
  - Suggest contacting the Home Connect Developer team if the user is having Home Connect authorisation problems, or are requesting support for additional appliance programs or options

- **📧 [Contact HOOBS support](https://support.hoobs.org/ticket)**
  - This is **not** a HOOBS plugin; the maintainer will not provide any support for issues that are HOOBS-specific
  - Redirect users to the HOOBS support team if they are using HOOBS and have not reproduced the issue with a vanilla (non-HOOBS) Homebridge setup