# Known Issues and Workarounds

## Pydantic Coroutine Serialization Error

**Issue Date:** 2025-08-05

**Description:**  
When attempting to run the main backend application, the following error occurs:

```
TypeError: cannot pickle 'coroutine' object
```

The error occurs in Pydantic's model construction process when trying to serialize (pickle) a coroutine object, which is not supported. This typically happens when an async function is used as a default value or validator in a Pydantic model.

**Error Details:**
```
File "/mnt/c/Users/Shane Holmes/CascadeProjects/windsurf-project/Coder/backend/venv/lib/python3.12/site-packages/pydantic/_internal/_model_construction.py", line 560, in generate_model_signature
  kwargs = {} if field.is_required() else {'default': field.get_default(call_default_factory=False)}  
                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   
File "/mnt/c/Users/Shane Holmes/CascadeProjects/windsurf-project/Coder/backend/venv/lib/python3.12/site-packages/pydantic/fields.py", line 507, in get_default
  return _utils.smart_deepcopy(self.default)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
File "/mnt/c/Users/Shane Holmes/CascadeProjects/windsurf-project/Coder/backend/venv/lib/python3.12/site-packages/pydantic/_internal/_utils.py", line 317, in smart_deepcopy
  return deepcopy(obj)  # slowest way when we actually might need a deepcopy
         ^^^^^^^^^^^^^
File "/usr/lib/python3.12/copy.py", line 151, in deepcopy
  rv = reductor(4)
       ^^^^^^^^^^^
TypeError: cannot pickle 'coroutine' object
```

**Investigation Status:**  
Initial investigation did not reveal the exact source of the issue. Potential areas to investigate:

1. Check for any async functions used as default values in Pydantic models
2. Look for any validators or field_validators that are async functions
3. Examine dependencies that might be using coroutines with Pydantic models
4. Check for any custom Pydantic field types that might involve coroutines

**Current Workaround:**  
Using the standalone AILang API server (`ailang_api.py`) on port 8001 for dashboard integration, which does not exhibit this issue. This server provides all the necessary endpoints for the dashboard with mock data.

**To Run the Standalone Server:**
```bash
# From the backend directory
python -m ailang_api
```

**Next Steps for Resolution:**
1. Conduct a more thorough code review to identify models using coroutines
2. Consider upgrading Pydantic to the latest version if using an older version
3. Replace any async functions used as defaults with synchronous alternatives
4. Add proper error handling for async function initialization in models

**Priority:** Medium - The standalone server provides a functional workaround for now.

## SQLAlchemy Import Issue

**Issue Date:** 2025-08-05

**Description:**  
The main backend application had an issue with SQLAlchemy imports in `user_management.py`, where the code was trying to use the SQLAlchemy alias `sa` outside of the try-except block where it was imported.

**Error Details:**
```
AttributeError: 'NoneType' object has no attribute 'Column'
```

**Resolution:**  
This issue has been resolved by:
1. Adding a `sqlalchemy_available` flag to track whether SQLAlchemy is successfully imported
2. Ensuring SQLAlchemy-dependent code is only defined when both `sqlalchemy_available` and `database_available` are True
3. Implementing proper fallback mechanisms for when SQLAlchemy is not available

The fix ensures robust operation even when SQLAlchemy is not available, aligning with the project's fallback philosophy.
