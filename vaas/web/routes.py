import os
import io
import json
import zipfile
import logging
import pandas as pd
from functools import wraps
from flask import Blueprint, request, render_template, jsonify, send_file, redirect, url_for
from flask_login import current_user, login_required as flask_login_required
from werkzeug.utils import secure_filename

from ..config import Config
from ..constants import ERROR_ADMIN_REQUIRED, ERROR_INVALID_RULE_TYPE
from ..core import RuleEngine, KnowledgeBase
from ..core.reports import ReportsDB
from ..core.logging_config import AuditLogger, LogLevel, LogCategory
from ..auth.permissions import require_permission

logger = logging.getLogger(__name__)

web_bp = Blueprint('web', __name__, template_folder='templates')
classifier = RuleEngine()


def login_required_if_enabled(f):
    """Custom decorator that requires login when authentication is enabled (users exist)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from ..auth.routes import is_auth_enabled

        # If auth is enabled (users exist), require login
        if is_auth_enabled():
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))

        return f(*args, **kwargs)
    return decorated_function


@web_bp.route('/health')
def health_check():
    """
    Health check endpoint for Docker/Kubernetes.
    Returns 200 OK if the application is healthy.
    """
    try:
        # Basic health check - ensure database connection works
        from ..db import get_db_provider
        provider = get_db_provider()
        success, message = provider.test_connection()

        if success:
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'version': '1.0'
            }), 200
        else:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': message
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@web_bp.route('/')
@login_required_if_enabled
def index():
    """Serve the React SPA with injected configuration."""
    from ..auth.routes import is_auth_enabled
    from ..auth.permissions import has_permission, get_role_display_name

    auth_enabled = is_auth_enabled()

    # Build configuration object for React app
    config = {
        'teamsList': classifier.get_known_teams(),
        'permissions': {
            'canModify': has_permission('modify_assignments') if current_user.is_authenticated else not auth_enabled,
            'canModifyKb': has_permission('add_kb_rules') if current_user.is_authenticated else not auth_enabled,
            'canExport': has_permission('export_files') if current_user.is_authenticated else not auth_enabled,
            'canManageUsers': has_permission('manage_users') if current_user.is_authenticated else not auth_enabled,
            'role': getattr(current_user, 'role', 'viewer') if current_user.is_authenticated else 'viewer',
        },
        'userInfo': {
            'username': current_user.username if current_user.is_authenticated else None,
            'displayName': getattr(current_user, 'display_name', 'Guest') if current_user.is_authenticated else 'Guest',
            'role': getattr(current_user, 'role', 'viewer') if current_user.is_authenticated else 'viewer',
            'roleDisplay': get_role_display_name(getattr(current_user, 'role', 'viewer')) if current_user.is_authenticated else 'Guest',
            'isAdmin': getattr(current_user, 'is_admin', False) if current_user.is_authenticated else False,
            'authEnabled': auth_enabled,
            'isAuthenticated': current_user.is_authenticated,
        }
    }

    # Read the built React index.html
    index_path = os.path.join(os.path.dirname(__file__), 'static', 'dist', 'index.html')

    try:
        with open(index_path, 'r') as f:
            html_content = f.read()

        # Inject configuration into the HTML
        config_script = f"""
    <script>
      window.__VAAS_CONFIG__ = {json.dumps(config)};
    </script>
"""
        # Insert before closing </head> tag
        html_content = html_content.replace('</head>', f'{config_script}\n  </head>')

        return html_content

    except FileNotFoundError:
        logger.error(f"React build not found at {index_path}")
        return """
            <h1>Frontend Not Built</h1>
            <p>Please run: <code>cd frontend && npm run build</code></p>
            <p>Then restart the Flask server.</p>
        """, 500

@web_bp.route('/config', methods=['GET'])
def get_config():
    """API endpoint to get app configuration for SPA."""
    from ..auth.routes import is_auth_enabled
    from ..auth.permissions import has_permission, get_role_display_name

    auth_enabled = is_auth_enabled()
    is_authenticated = current_user.is_authenticated

    # If auth is enabled but user is not authenticated, indicate they need to login
    if auth_enabled and not is_authenticated:
        return jsonify({
            'requiresAuth': True,
            'redirectUrl': '/login',
            'teamsList': classifier.get_known_teams(),
            'permissions': {
                'canModify': False,
                'canModifyKb': False,
                'canExport': False,
                'canManageUsers': False,
                'role': None,
            },
            'userInfo': {
                'username': None,
                'displayName': None,
                'role': None,
                'roleDisplay': None,
                'isAdmin': False,
                'authEnabled': True,
                'isAuthenticated': False,
            }
        })

    config = {
        'requiresAuth': False,
        'teamsList': classifier.get_known_teams(),
        'permissions': {
            'canModify': has_permission('modify_assignments') if is_authenticated else True,
            'canModifyKb': has_permission('add_kb_rules') if is_authenticated else True,
            'canExport': has_permission('export_files') if is_authenticated else True,
            'canManageUsers': has_permission('manage_users') if is_authenticated else True,
            'role': getattr(current_user, 'role', 'viewer') if is_authenticated else 'viewer',
        },
        'userInfo': {
            'username': current_user.username if is_authenticated else None,
            'displayName': getattr(current_user, 'display_name', None) if is_authenticated else None,
            'role': getattr(current_user, 'role', 'viewer') if is_authenticated else 'viewer',
            'roleDisplay': get_role_display_name(getattr(current_user, 'role', 'viewer')) if is_authenticated else None,
            'isAdmin': getattr(current_user, 'is_admin', False) if is_authenticated else False,
            'authEnabled': auth_enabled,
            'isAuthenticated': is_authenticated,
        }
    }

    return jsonify(config)

@web_bp.route('/classify', methods=['POST'])
@login_required_if_enabled
def classify():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)

        df = pd.read_excel(filepath)

        # Log file upload
        AuditLogger.log_app_event(
            f"User uploaded file for classification: {filename} ({len(df)} rows)",
            level=LogLevel.INFO,
            details={'filename': filename, 'row_count': len(df)}
        )

        # Ensure rules are fresh for this new scan
        classifier.reload_rules()

        # Pure Rules - No Training Check needed
        result_df = classifier.predict(df)

        # Save report to database
        results = result_df.to_dict(orient='records')

        # Robust NaN cleanup function
        import math
        def clean_nan(obj):
            if isinstance(obj, float) and math.isnan(obj):
                return None
            elif isinstance(obj, dict):
                return {k: clean_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan(v) for v in obj]
            return obj

        # Clean results before usage
        results = clean_nan(results)

        uploaded_by = current_user.username if current_user.is_authenticated else 'anonymous'

        # Save the report (optional - don't fail classification if report save fails)
        report_uuid = None
        try:
            success, msg, report_uuid = ReportsDB.create_report(
                filename=filename,
                uploaded_by=uploaded_by,
                items=results
            )
            if success:
                AuditLogger.log_app_event(
                    f"Classification report saved: {report_uuid}",
                    level=LogLevel.INFO,
                    details={'report_uuid': report_uuid, 'filename': filename}
                )
        except Exception as e:
            # Log but don't fail the classification
            import logging
            logging.getLogger(__name__).warning(f"Failed to save report: {e}")
            AuditLogger.log_app_event(
                f"Failed to save classification report: {str(e)}",
                level=LogLevel.ERROR,
                details={'filename': filename, 'error': str(e)}
            )

        # Return sanitized JSON with explicit column order
        return jsonify({
            'data': results,
            'columns': list(result_df.columns),  # Preserve column order for export
            'report_uuid': report_uuid
        })

    except Exception as e:
        AuditLogger.log_app_event(
            f"Classification failed: {str(e)}",
            level=LogLevel.ERROR,
            details={'error': str(e)}
        )
        return jsonify({'error': str(e)}), 500

@web_bp.route('/export', methods=['POST'])
@login_required_if_enabled
def export_files():
    req = request.json
    data = req.get('data')
    export_type = req.get('type')
    column_order = req.get('columns')  # Optional: preserve column order from frontend

    # Create DataFrame preserving column order
    if data and len(data) > 0:
        if column_order:
            # Use explicitly provided column order
            df = pd.DataFrame(data, columns=column_order)
        else:
            # Preserve order from first row's keys (Python 3.7+ dict order)
            df = pd.DataFrame(data, columns=list(data[0].keys()))
    else:
        df = pd.DataFrame(data)

    if export_type == 'master':
        AuditLogger.log_app_event(
            f"User exported master file with {len(df)} records",
            level=LogLevel.INFO,
            details={'export_type': 'master', 'record_count': len(df)}
        )
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return send_file(output, as_attachment=True, download_name='classified_master.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    elif export_type == 'teams':
        teams = df['Assigned_Team'].unique()
        AuditLogger.log_app_event(
            f"User exported team reports for {len(teams)} teams ({len(df)} records)",
            level=LogLevel.INFO,
            details={'export_type': 'teams', 'team_count': len(teams), 'record_count': len(df)}
        )
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for team in teams:
                if not team: continue
                team_df = df[df['Assigned_Team'] == team]

                # Find Severity column (common variations)
                severity_col = None
                for col in team_df.columns:
                    if col.lower() in ['severity', 'risk', 'risk level', 'severity level', 'criticality']:
                        severity_col = col
                        break

                excel_buffer = io.BytesIO()

                # Use xlsxwriter for pivot table support
                import xlsxwriter
                workbook = xlsxwriter.Workbook(excel_buffer, {'in_memory': True})

                # Sheet 1: Vulnerability Data
                data_sheet = workbook.add_worksheet('Vulnerabilities')
                columns = list(team_df.columns)

                # Write headers
                for col_idx, col_name in enumerate(columns):
                    data_sheet.write(0, col_idx, col_name)

                # Write data rows
                for row_idx, row in enumerate(team_df.values, start=1):
                    for col_idx, value in enumerate(row):
                        # Handle NaN and other types
                        if pd.isna(value):
                            data_sheet.write(row_idx, col_idx, '')
                        else:
                            data_sheet.write(row_idx, col_idx, value)

                # Sheet 2: Summary (static crosstab)
                summary_sheet = workbook.add_worksheet('Summary')
                if severity_col and 'Title' in team_df.columns:
                    pivot_df = pd.crosstab(
                        team_df['Title'],
                        team_df[severity_col],
                        margins=True,
                        margins_name='Total'
                    )
                    # Write crosstab
                    summary_sheet.write(0, 0, 'Title')
                    for col_idx, col_name in enumerate(pivot_df.columns, start=1):
                        summary_sheet.write(0, col_idx, col_name)
                    for row_idx, (title, row) in enumerate(pivot_df.iterrows(), start=1):
                        summary_sheet.write(row_idx, 0, title)
                        for col_idx, value in enumerate(row.values, start=1):
                            summary_sheet.write(row_idx, col_idx, value)
                elif 'Title' in team_df.columns:
                    summary_df = team_df['Title'].value_counts().reset_index()
                    summary_sheet.write(0, 0, 'Title')
                    summary_sheet.write(0, 1, 'Count')
                    for row_idx, row in enumerate(summary_df.values, start=1):
                        summary_sheet.write(row_idx, 0, row[0])
                        summary_sheet.write(row_idx, 1, row[1])

                # Sheet 3: Severity Count pivot table using pandas
                if severity_col:
                    # Create pivot: Severity -> Count
                    severity_pivot = team_df[severity_col].value_counts().reset_index()
                    severity_pivot.columns = [severity_col, 'Count']
                    # Sort by severity (Critical > High > Medium > Low > Info)
                    severity_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Info': 4, 'Informational': 5}
                    severity_pivot['_sort'] = severity_pivot[severity_col].map(lambda x: severity_order.get(x, 99))
                    severity_pivot = severity_pivot.sort_values('_sort').drop('_sort', axis=1)

                    # Add total row
                    total_row = pd.DataFrame({severity_col: ['Total'], 'Count': [severity_pivot['Count'].sum()]})
                    severity_pivot = pd.concat([severity_pivot, total_row], ignore_index=True)

                    # Write to pivot sheet
                    pivot_sheet = workbook.add_worksheet('Pivot Table')
                    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#4472C4', 'font_color': 'white', 'border': 1})
                    cell_fmt = workbook.add_format({'border': 1})
                    total_fmt = workbook.add_format({'bold': True, 'border': 1, 'bg_color': '#D9E2F3'})

                    # Write headers
                    pivot_sheet.write(0, 0, severity_col, header_fmt)
                    pivot_sheet.write(0, 1, 'Count', header_fmt)

                    # Write data
                    for row_idx, row in enumerate(severity_pivot.values, start=1):
                        fmt = total_fmt if row[0] == 'Total' else cell_fmt
                        pivot_sheet.write(row_idx, 0, row[0], fmt)
                        pivot_sheet.write(row_idx, 1, row[1], fmt)

                    # Set column widths
                    pivot_sheet.set_column('A:A', 15)
                    pivot_sheet.set_column('B:B', 10)

                workbook.close()
                excel_buffer.seek(0)
                zip_file.writestr(f"{team}_vulnerabilities.xlsx", excel_buffer.read())

        zip_buffer.seek(0)
        return send_file(zip_buffer, as_attachment=True, download_name='team_reports.zip', mimetype='application/zip')

    return jsonify({'error': 'Invalid type'}), 400

@web_bp.route('/kb/data', methods=['GET'])
@login_required_if_enabled
def kb_data():
    """Returns data for the Knowledge Base UI."""
    try:
        # Load Hostnames
        host_map = KnowledgeBase.load_hostname_map()
        # Convert to list for UI
        host_list = [{'hostname': k, 'team': v} for k, v in host_map.items()]

        # Load Title Rules
        title_rules_raw = KnowledgeBase.load_title_rules()
        title_list = []
        for team, rules in title_rules_raw.items():
            for r in rules:
                title_list.append({'title': r['contains'], 'team': team})
        
        return jsonify({
            'hostnames': host_list,
            'titles': title_list,
            'teams': classifier.get_known_teams()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@web_bp.route('/kb/add_rule', methods=['POST'])
@require_permission('add_kb_rules')
def add_rule():
    """Adds a new rule to the knowledge base."""
    req = request.json
    rule_type = req.get('type') # 'hostname' or 'title'
    key = req.get('key')
    team = req.get('team')

    if not key or not team:
        return jsonify({'success': False, 'message': 'Missing key or team'}), 400

    if rule_type == 'hostname':
        success, msg = KnowledgeBase.add_hostname_rule(key, team)
    elif rule_type == 'title':
        success, msg = KnowledgeBase.add_title_rule(key, team)
    else:
        return jsonify({'success': False, 'message': ERROR_INVALID_RULE_TYPE}), 400

    if success:
        classifier.reload_rules()
        AuditLogger.log_db_event(
            f"Added {rule_type} rule to Knowledge Base: {key} -> {team}",
            level=LogLevel.INFO,
            details={'rule_type': rule_type, 'key': key, 'team': team}
        )
        return jsonify({'success': True, 'message': msg})
    else:
        AuditLogger.log_db_event(
            f"Failed to add {rule_type} rule: {msg}",
            level=LogLevel.WARNING,
            details={'rule_type': rule_type, 'key': key, 'team': team, 'error': msg}
        )
        return jsonify({'success': False, 'message': msg}), 500

@web_bp.route('/kb/bulk_add_rules', methods=['POST'])
@require_permission('save_to_kb')
def bulk_add_rules():
    """
    Bulk add hostnames and title rules to KB (Save to KB button).
    Automatically re-classifies current data with new rules.
    """
    req = request.json
    hosts = req.get('hostnames', [])
    titles = req.get('titles', [])
    current_data = req.get('currentData', None)

    h_count = 0
    t_count = 0
    errors = 0

    # Process Hostnames
    for item in hosts:
        h = item.get('hostname')
        t = item.get('team')
        if h and t:
            success, _ = KnowledgeBase.add_hostname_rule(h, t)
            if success:
                h_count += 1
            else:
                errors += 1

    # Process Titles (uses upsert now, no need for edit fallback)
    for item in titles:
        title = item.get('title')
        t = item.get('team')
        if title and t:
            success, _ = KnowledgeBase.add_title_rule(title, t)
            if success:
                t_count += 1
            else:
                errors += 1

    # Reload classifier rules to pick up the new additions
    classifier.reload_rules()

    response = {
        'success': True,
        'message': f"Saved {h_count} Hostnames and {t_count} Title Rules.",
        'rulesAdded': h_count + t_count
    }

    if errors > 0:
        response['message'] += f" ({errors} skipped/errors)"

    # Re-classify current data if provided
    if current_data and len(current_data) > 0:
        try:
            reclassified_data, method_changes, team_changes = classifier.reclassify_data(
                current_data, preserve_manual=True
            )

            response['reclassifiedData'] = reclassified_data
            response['changesCount'] = team_changes
            response['methodChanges'] = method_changes

            if team_changes > 0 or method_changes > 0:
                response['message'] += f" Updated {team_changes} team assignments, {method_changes} fuzzy→rule."

            AuditLogger.log_app_event(
                f"Save to KB: {h_count} hostnames, {t_count} titles added. Reclassified {team_changes} teams, {method_changes} fuzzy→rule",
                level=LogLevel.INFO,
                details={
                    'hostnames_added': h_count,
                    'titles_added': t_count,
                    'team_changes': team_changes,
                    'method_changes': method_changes
                }
            )

        except Exception as e:
            logger.error(f"Re-classification failed: {e}")
            response['reclassificationError'] = str(e)

    return jsonify(response)


@web_bp.route('/kb/confirm_fuzzy', methods=['POST'])
@require_permission('save_to_kb')
def confirm_fuzzy_match():
    """
    Confirms a fuzzy-matched rule and adds it to the KB.
    Re-classifies all items in current data that would match this new rule.

    Logic:
    - If team is System Admin / Out of Scope → Add TITLE rule
    - If team is a specific team (via hostname) → Add HOSTNAME rule
    """
    req = request.json
    row = req.get('row', {})
    current_data = req.get('currentData', [])

    hostname = row.get('hostname', '').strip()
    title = row.get('Title', '').strip()
    team = row.get('Assigned_Team', '').strip()

    logger.info(f"Confirm fuzzy request: title='{title[:60]}', hostname='{hostname}', team='{team}'")

    if not team:
        return jsonify({'success': False, 'message': 'Missing team assignment'}), 400

    # Determine what type of rule to add based on the team
    system_teams = ['system admin', 'out of linux scope', 'out of platform scope']

    if team.lower() in system_teams:
        # System-level teams → add Title rule
        if not title:
            return jsonify({'success': False, 'message': 'Missing title for title-based rule'}), 400
        rule_type = 'title'
        key = title
        success, msg = KnowledgeBase.add_title_rule(title, team)
        logger.info(f"Added title rule: success={success}, msg={msg}")
    else:
        # Application-based teams → add Hostname rule
        if not hostname:
            return jsonify({'success': False, 'message': 'Missing hostname for hostname-based rule'}), 400
        rule_type = 'hostname'
        key = hostname
        success, msg = KnowledgeBase.add_hostname_rule(hostname, team)
        logger.info(f"Added hostname rule: success={success}, msg={msg}")

    if not success:
        return jsonify({'success': False, 'message': f'Failed to add rule: {msg}'}), 500

    # Reload classifier rules to pick up new addition
    classifier.reload_rules()

    # Verify the rule was loaded
    if rule_type == 'title':
        team_key = classifier._find_team_key(team.lower())
        if team_key and team_key in classifier.rules:
            rules_for_team = classifier.rules[team_key]
            # Check if our exact title is in there
            normalized_key = ' '.join(key.strip().lower().split())
            found = any(' '.join(r.get('contains', '').strip().lower().split()) == normalized_key for r in rules_for_team)
            logger.info(f"Rule verification: team_key={team_key}, rules_count={len(rules_for_team)}, title_found={found}")
        else:
            logger.warning(f"Rule verification: team_key={team_key} not found in classifier.rules")

    logger.info(f"Fuzzy match confirmed: {rule_type}='{key[:50]}' → {team}")

    AuditLogger.log_db_event(
        f"Confirmed fuzzy match as KB rule: {rule_type}='{key[:60]}' → {team}",
        level=LogLevel.INFO,
        details={'rule_type': rule_type, 'key': key, 'team': team}
    )

    response = {
        'success': True,
        'message': f'{rule_type.capitalize()} rule added to Knowledge Base',
        'rule': {'type': rule_type, 'key': key, 'team': team}
    }

    # Re-classify current data if provided
    if current_data and len(current_data) > 0:
        try:
            # Log pre-reclassification state
            fuzzy_before = sum(1 for item in current_data if item.get('Method') == 'Fuzzy')
            rule_before = sum(1 for item in current_data if item.get('Method') == 'Rule')
            logger.info(f"Before reclassify: {len(current_data)} items, Fuzzy={fuzzy_before}, Rule={rule_before}")

            # Count how many items have the same title we just added
            normalized_key = ' '.join(key.strip().lower().split())
            matching_titles = sum(1 for item in current_data
                                  if ' '.join(item.get('Title', '').strip().lower().split()) == normalized_key)
            logger.info(f"Items with matching title '{key[:40]}...': {matching_titles}")

            reclassified_data, method_changes, team_changes = classifier.reclassify_data(
                current_data, preserve_manual=True
            )

            # Log post-reclassification state
            fuzzy_after = sum(1 for item in reclassified_data if item.get('Method') == 'Fuzzy')
            rule_after = sum(1 for item in reclassified_data if item.get('Method') == 'Rule')
            logger.info(f"After reclassify: Fuzzy={fuzzy_after}, Rule={rule_after}, method_changes={method_changes}")

            response['reclassifiedData'] = reclassified_data
            response['changesCount'] = team_changes
            response['methodChanges'] = method_changes

            # Build descriptive message
            if method_changes > 0 or team_changes > 0:
                msg_parts = []
                if method_changes > 0:
                    msg_parts.append(f"{method_changes} fuzzy→rule")
                if team_changes > 0:
                    msg_parts.append(f"{team_changes} team changes")
                response['message'] = f"Rule added. Updated: {', '.join(msg_parts)}."
            else:
                response['message'] = "Rule added. No other items matched."

            AuditLogger.log_app_event(
                f"Fuzzy confirm reclassified: {method_changes} fuzzy→rule, {team_changes} team changes",
                level=LogLevel.INFO,
                details={
                    'rule_type': rule_type,
                    'key': key[:60],
                    'team': team,
                    'method_changes': method_changes,
                    'team_changes': team_changes
                }
            )

        except Exception as e:
            logger.error(f"Re-classification failed: {e}", exc_info=True)
            response['reclassificationError'] = str(e)

    return jsonify(response)


@web_bp.route('/kb/debug', methods=['GET'])
def debug_kb():
    """Debug endpoint to check loaded rules and hostnames."""
    classifier.reload_rules()

    # Get rule counts by team
    rule_counts = {team: len(rules) for team, rules in classifier.rules.items()}

    # Sample rules for key teams
    samples = {}
    for team in ['System Admin', 'Application', 'Out of Linux Scope']:
        team_key = classifier._find_team_key(team.lower())
        if team_key and team_key in classifier.rules:
            rules = classifier.rules[team_key][:5]
            samples[team] = [r.get('contains', '')[:60] for r in rules]

    return jsonify({
        'hostname_count': len(classifier.hostname_map),
        'total_rules': sum(rule_counts.values()),
        'rules_by_team': rule_counts,
        'fuzzy_candidates_count': len(classifier.fuzzy_candidates),
        'sample_rules': samples
    })


@web_bp.route('/kb/edit_rule', methods=['PUT'])
@require_permission('edit_kb_rules')
def edit_rule():
    """Edits an existing rule in the knowledge base."""
    req = request.json
    rule_type = req.get('type')  # 'hostname' or 'title'
    old_key = req.get('old_key')
    new_key = req.get('new_key')
    new_team = req.get('new_team')

    if not old_key or not new_key or not new_team:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    if rule_type == 'hostname':
        success, msg = KnowledgeBase.edit_hostname_rule(old_key, new_key, new_team)
    elif rule_type == 'title':
        success, msg = KnowledgeBase.edit_title_rule(old_key, new_key, new_team)
    else:
        return jsonify({'success': False, 'message': ERROR_INVALID_RULE_TYPE}), 400

    if success:
        classifier.reload_rules()
        AuditLogger.log(
            action='KB Rule Edited',
            details=f"Edited {rule_type} rule: '{old_key}' → '{new_key}' ({new_team})",
            username=current_user.username if current_user.is_authenticated else 'system',
            level=LogLevel.INFO,
            category=LogCategory.AUDIT
        )
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'message': msg}), 500

@web_bp.route('/kb/delete_rule', methods=['DELETE'])
@require_permission('delete_kb_rules')
def delete_rule():
    """Deletes a rule from the knowledge base."""
    req = request.json
    rule_type = req.get('type')  # 'hostname' or 'title'
    key = req.get('key')

    if not key:
        return jsonify({'success': False, 'message': 'Missing key'}), 400

    if rule_type == 'hostname':
        success, msg = KnowledgeBase.delete_hostname_rule(key)
    elif rule_type == 'title':
        success, msg = KnowledgeBase.delete_title_rule(key)
    else:
        return jsonify({'success': False, 'message': ERROR_INVALID_RULE_TYPE}), 400

    if success:
        classifier.reload_rules()
        AuditLogger.log(
            action='KB Rule Deleted',
            details=f"Deleted {rule_type} rule: '{key}'",
            username=current_user.username if current_user.is_authenticated else 'system',
            level=LogLevel.WARNING,
            category=LogCategory.AUDIT
        )
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'message': msg}), 500

@web_bp.route('/kb/export', methods=['GET'])
@require_permission('import_export_kb')
def export_kb():
    """Exports the entire Knowledge Base to Excel."""
    try:
        output_file = os.path.join(Config.DATA_DIR, 'knowledge_base.xlsx')
        success, msg = KnowledgeBase.export_db_to_excel(output_file)
        if success:
            AuditLogger.log(
                action='KB Export',
                details='Exported Knowledge Base to Excel',
                username=current_user.username if current_user.is_authenticated else 'system',
                level=LogLevel.INFO,
                category=LogCategory.AUDIT
            )
            return send_file(output_file, as_attachment=True, download_name='knowledge_base.xlsx')
        else:
            return jsonify({'error': msg}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@web_bp.route('/kb/import', methods=['POST'])
@require_permission('import_export_kb')
def import_kb():
    """
    Imports Knowledge Base from Excel.

    Supports two modes via 'mode' form field:
    - 'merge' (default): Upsert rules, keeping existing ones
    - 'replace': Clear all existing rules first, then import (full restore)
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Get import mode from form data (default to merge for backward compatibility)
    mode = request.form.get('mode', 'merge')
    if mode not in ['merge', 'replace']:
        return jsonify({'error': 'Invalid mode. Must be "merge" or "replace"'}), 400

    try:
        filepath = os.path.join(Config.DATA_DIR, 'uploaded_kb.xlsx')
        file.save(filepath)

        success, msg = KnowledgeBase.import_excel_to_db(filepath, mode=mode)

        if success:
            # Critical: Refresh active rules in memory
            classifier.reload_rules()

            # Add mode info to message
            mode_desc = "merged with existing" if mode == 'merge' else "replaced all existing"

            # Audit log the import
            AuditLogger.log(
                action='KB Import',
                details=f"Imported Knowledge Base from {file.filename} ({mode_desc} rules)",
                username=current_user.username if current_user.is_authenticated else 'system',
                level=LogLevel.INFO,
                category=LogCategory.AUDIT
            )

            return jsonify({'success': True, 'message': f"{msg} (Mode: {mode_desc} rules)"})
        else:
             return jsonify({'error': msg}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Reports API ==============

@web_bp.route('/api/reports', methods=['GET'])
@login_required_if_enabled
def list_reports():
    """List all classification reports with pagination."""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        reports = ReportsDB.list_reports(limit=limit, offset=offset)
        total = ReportsDB.get_reports_count()

        return jsonify({
            'success': True,
            'reports': reports,
            'total': total,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/reports/<report_uuid>', methods=['GET'])
@login_required_if_enabled
def get_report(report_uuid):
    """Get a specific report by UUID."""
    try:
        report = ReportsDB.get_report(report_uuid)
        if report:
            return jsonify({'success': True, 'report': report})
        else:
            return jsonify({'success': False, 'error': 'Report not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/reports/<report_uuid>', methods=['DELETE'])
@require_permission('delete_reports')
def delete_report(report_uuid):
    """Delete a report."""
    try:
        success, message = ReportsDB.delete_report(report_uuid)
        if success:
            AuditLogger.log(
                action='Report Deleted',
                details=f"Deleted report: {report_uuid}",
                username=current_user.username if current_user.is_authenticated else 'system',
                level=LogLevel.WARNING,
                category=LogCategory.AUDIT
            )
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'error': message}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/reports/<report_uuid>/items', methods=['GET'])
@login_required_if_enabled
def get_report_items(report_uuid):
    """Get items for a report with pagination."""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        items = ReportsDB.get_report_items(report_uuid, limit=limit, offset=offset)
        return jsonify({
            'success': True,
            'items': items,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============== Knowledge Base Settings Page ==============

@web_bp.route('/settings/knowledgebase', methods=['GET'])
@require_permission('import_export_kb')
def kb_settings_page():
    """Knowledge Base Settings page - admin only."""
    try:
        # Get statistics from the database
        conn = KnowledgeBase._get_conn()
        cursor = conn.cursor()

        # Count hostnames
        cursor.execute('SELECT COUNT(*) FROM hostnames')
        hostname_count = cursor.fetchone()[0]

        # Count title rules
        cursor.execute('SELECT COUNT(*) FROM rules')
        title_count = cursor.fetchone()[0]

        conn.close()

        stats = {
            'hostname_count': hostname_count,
            'title_count': title_count
        }

        return render_template('kb_settings.html', stats=stats)
    except Exception as e:
        logger.error(f"Error loading KB settings page: {e}")
        # Return with default stats on error
        return render_template('kb_settings.html', stats={'hostname_count': 0, 'title_count': 0})


# ============== Database Optimization API ==============

@web_bp.route('/api/db/stats', methods=['GET'])
@login_required_if_enabled
def get_db_stats():
    """Get database statistics for reports and items."""
    from ..core.db_optimizer import DatabaseOptimizer

    try:
        stats = DatabaseOptimizer.get_database_stats()
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        logger.error(f"Error getting DB stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/db/duplicates', methods=['GET'])
@login_required_if_enabled
def get_db_duplicates():
    """Find potential duplicate reports."""
    from ..core.db_optimizer import DatabaseOptimizer

    if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
        return jsonify({'success': False, 'error': ERROR_ADMIN_REQUIRED}), 403

    try:
        duplicates = DatabaseOptimizer.find_duplicate_reports()
        return jsonify({
            'success': True,
            'duplicates': duplicates,
            'count': len(duplicates)
        })
    except Exception as e:
        logger.error(f"Error finding duplicates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/db/cleanup', methods=['POST'])
@login_required_if_enabled
def cleanup_database():
    """
    Run database cleanup operations.

    Body params:
        - delete_old: bool (delete old reports)
        - retention_days: int (days to keep, default 90)
        - delete_duplicates: bool (delete duplicate reports)
        - vacuum: bool (optimize database after cleanup)
    """
    from ..core.db_optimizer import DatabaseOptimizer

    if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
        return jsonify({'success': False, 'error': ERROR_ADMIN_REQUIRED}), 403

    data = request.get_json() or {}

    delete_old = data.get('delete_old', False)
    retention_days = data.get('retention_days', 90)
    delete_duplicates = data.get('delete_duplicates', False)
    vacuum = data.get('vacuum', False)

    try:
        results = DatabaseOptimizer.full_cleanup(
            delete_old=delete_old,
            retention_days=retention_days,
            delete_duplicates=delete_duplicates,
            vacuum=vacuum
        )

        # Log specific action with clear description
        username = current_user.username if current_user.is_authenticated else 'system'

        # Determine which action was performed and log it specifically
        if delete_old and not delete_duplicates and not vacuum:
            action = 'Delete Old Reports'
            details = f"Deleted {results.get('deleted_reports', 0)} reports older than {retention_days} days"
        elif delete_duplicates and not delete_old and not vacuum:
            action = 'Remove Duplicates'
            details = f"Removed {results.get('duplicates_removed', 0)} duplicate entries"
        elif vacuum and not delete_old and not delete_duplicates:
            action = 'Optimize Database'
            details = f"Database optimization {'successful' if results.get('vacuum_success') else 'completed'}"
        elif delete_old and delete_duplicates and vacuum:
            action = 'Full Maintenance'
            details = f"Deleted {results.get('deleted_reports', 0)} old reports, removed {results.get('duplicates_removed', 0)} duplicates, optimized database"
        else:
            # Mixed operations
            actions = []
            if delete_old:
                actions.append(f"deleted {results.get('deleted_reports', 0)} old reports")
            if delete_duplicates:
                actions.append(f"removed {results.get('duplicates_removed', 0)} duplicates")
            if vacuum:
                actions.append("optimized database")
            action = 'Database Maintenance'
            details = ', '.join(actions).capitalize() if actions else 'Maintenance completed'

        AuditLogger.log(
            action=action,
            details=details,
            username=username,
            level=LogLevel.INFO,
            category=LogCategory.SYSTEM
        )

        return jsonify(results)

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@web_bp.route('/api/db/vacuum', methods=['POST'])
@login_required_if_enabled
def vacuum_database():
    """Optimize database and reclaim unused space."""
    from ..core.db_optimizer import DatabaseOptimizer

    if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
        return jsonify({'success': False, 'error': ERROR_ADMIN_REQUIRED}), 403

    try:
        success, message = DatabaseOptimizer.vacuum_database()

        if success:
            username = current_user.username if current_user.is_authenticated else 'system'
            AuditLogger.log(
                action='Optimize Database',
                details='Database vacuum and optimization completed successfully',
                username=username,
                level=LogLevel.INFO,
                category=LogCategory.SYSTEM
            )

        return jsonify({'success': success, 'message': message})

    except Exception as e:
        logger.error(f"Error vacuuming database: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
