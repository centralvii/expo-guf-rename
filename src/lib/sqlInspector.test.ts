import { describe, it, expect } from 'vitest';
import { formatSql, detectSqlStatementType, validateSql, calculateSqlRiskLevel } from './sqlInspector';

describe('formatSql', () => {
  it('formats a basic SELECT', () => {
    const result = formatSql('select id, name from users where status = \'active\'');
    expect(result).toContain('SELECT');
    expect(result).toContain('FROM');
    expect(result).toContain('WHERE');
  });

  it('returns empty string for empty input', () => {
    expect(formatSql('')).toBe('');
    expect(formatSql('   ')).toBe('');
  });

  it('uppercases keywords', () => {
    const result = formatSql('select * from orders inner join users on orders.user_id = users.id');
    expect(result).toMatch(/^SELECT/);
    expect(result).toContain('INNER JOIN');
  });
});

describe('detectSqlStatementType', () => {
  it('detects SELECT', () => {
    expect(detectSqlStatementType('SELECT * FROM users')).toBe('select');
  });

  it('detects INSERT', () => {
    expect(detectSqlStatementType('INSERT INTO users VALUES (1)')).toBe('insert');
  });

  it('detects UPDATE', () => {
    expect(detectSqlStatementType('UPDATE users SET name = \'test\' WHERE id = 1')).toBe('update');
  });

  it('detects DELETE', () => {
    expect(detectSqlStatementType('DELETE FROM users WHERE id = 1')).toBe('delete');
  });

  it('detects DDL', () => {
    expect(detectSqlStatementType('CREATE TABLE users (id int)')).toBe('ddl');
    expect(detectSqlStatementType('DROP TABLE users')).toBe('ddl');
  });

  it('returns unknown for empty', () => {
    expect(detectSqlStatementType('')).toBe('unknown');
  });
});

describe('validateSql', () => {
  it('flags DELETE without WHERE', () => {
    const issues = validateSql('DELETE FROM users');
    expect(issues.some((i) => i.id.startsWith('delete-without-where'))).toBe(true);
  });

  it('flags SELECT *', () => {
    const issues = validateSql('SELECT * FROM users');
    expect(issues.some((i) => i.id.startsWith('select-star'))).toBe(true);
  });

  it('returns empty issues for clean SQL', () => {
    const issues = validateSql('SELECT id FROM users WHERE status = \'active\'');
    expect(issues.length).toBe(0);
  });

  it('flags empty SQL as error', () => {
    const issues = validateSql('');
    expect(issues[0]?.severity).toBe('error');
  });
});

describe('calculateSqlRiskLevel', () => {
  it('returns safe when no issues', () => {
    expect(calculateSqlRiskLevel([])).toBe('safe');
  });

  it('returns warning when only warnings', () => {
    const issues = validateSql('SELECT * FROM users');
    expect(calculateSqlRiskLevel(issues)).toBe('warning');
  });

  it('returns danger when errors present', () => {
    const issues = validateSql('DELETE FROM users');
    expect(calculateSqlRiskLevel(issues)).toBe('danger');
  });
});
