/*
 * Copyright (C) 2015-2016  Ben Ockmore
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

const Promise = require('bluebird');

const util = require('../lib/util');
const Bookshelf = require('./bookshelf');
const Publisher = require('../lib/index').Publisher;
const Revision = require('../lib/index').Revision;
const Gender = require('../lib/index').Gender;
const EditorType = require('../lib/index').EditorType;
const Editor = require('../lib/index').Editor;
const Annotation = require('../lib/index').Annotation;
const Disambiguation = require('../lib/index').Disambiguation;
const AliasSet = require('../lib/index').AliasSet;
const IdentifierSet = require('../lib/index').IdentifierSet;
const RelationshipSet = require('../lib/index').RelationshipSet;

const genderData = {
	id: 1,
	name: 'test'
};
const editorTypeData = {
	id: 1,
	label: 'test_type'
};
const editorAttribs = {
	id: 1,
	name: 'bob',
	genderId: 1,
	typeId: 1
};
const setData = {id: 1};

describe('Publisher model', () => {
	beforeEach(() =>
		new Gender(genderData).save(null, {method: 'insert'})
			.then(() =>
				new EditorType(editorTypeData).save(null, {method: 'insert'})
			)
			.then(() =>
				new Editor(editorAttribs).save(null, {method: 'insert'})
			)
			.then(() =>
				Promise.all([
					new AliasSet(setData).save(null, {method: 'insert'}),
					new IdentifierSet(setData).save(null, {method: 'insert'}),
					new RelationshipSet(setData).save(null, {method: 'insert'}),
					new Disambiguation({
						id: 1,
						comment: 'Test Disambiguation'
					})
						.save(null, {method: 'insert'})
				])
			)
	);

	afterEach(function truncate() {
		this.timeout(0);

		return util.truncateTables(Bookshelf, [
			'bookbrainz.entity',
			'bookbrainz.revision',
			'bookbrainz.relationship_set',
			'bookbrainz.identifier_set',
			'bookbrainz.alias_set',
			'bookbrainz.annotation',
			'bookbrainz.disambiguation',
			'bookbrainz.editor',
			'bookbrainz.editor_type',
			'musicbrainz.gender'
		]);
	});

	it('should return a JSON object with correct keys when saved', () => {
		const revisionAttribs = {
			id: 1,
			authorId: 1
		};
		const publisherAttribs = {
			revisionId: 1,
			aliasSetId: 1,
			identifierSetId: 1,
			relationshipSetId: 1,
			annotationId: 1,
			disambiguationId: 1
		};

		const revisionPromise = new Revision(revisionAttribs)
			.save(null, {method: 'insert'});

		const annotationPromise = revisionPromise
			.then(() =>
				new Annotation({
					id: 1,
					content: 'Test Annotation',
					lastRevisionId: 1
				})
					.save(null, {method: 'insert'})
			);

		const entityPromise = annotationPromise
			.then(() =>
				new Publisher(publisherAttribs).save(null, {method: 'insert'})
			)
			.then((model) => model.refresh({
				withRelated: [
					'relationshipSet', 'aliasSet', 'identifierSet',
					'annotation', 'disambiguation'
				]
			}))
			.then((entity) => entity.toJSON());

		return expect(entityPromise).to.eventually.have.all.keys([
			'aliasSet', 'aliasSetId', 'annotation', 'annotationId', 'areaId',
			'bbid', 'beginDate', 'beginDay', 'beginMonth', 'beginYear',
			'dataId', 'defaultAliasId', 'disambiguation', 'disambiguationId',
			'endDate', 'endDay', 'endMonth', 'endYear', 'ended',
			'identifierSetId', 'identifierSet', 'master', 'relationshipSet',
			'relationshipSetId', 'revisionId', 'type', 'typeId'
		]);
	});

	it('should return the master revision when multiple revisions exist',
		() => {
			/* Revision ID order is reversed so that result is not dependent on
			row order */
			const revisionAttribs = {
				id: 1,
				authorId: 1
			};
			const entityAttribs = {
				revisionId: 1,
				aliasSetId: 1,
				identifierSetId: 1,
				relationshipSetId: 1
			};

			const revisionOnePromise = new Revision(revisionAttribs)
				.save(null, {method: 'insert'});

			const entityPromise = revisionOnePromise
				.then(() =>
					new Publisher(entityAttribs).save()
				)
				.then((model) => model.refresh())
				.then((entity) => entity.toJSON());

			const revisionTwoPromise = entityPromise
				.then(() => {
					revisionAttribs.id = 2;
					return new Revision(revisionAttribs)
						.save(null, {method: 'insert'});
				});

			const entityUpdatePromise = Promise.join(entityPromise,
				revisionTwoPromise, (entity) => {
					const entityUpdateAttribs = {
						bbid: entity.bbid,
						revisionId: 2,
						ended: true
					};

					return new Publisher(entityUpdateAttribs).save();
				})
				.then((model) =>
					new Publisher({bbid: model.get('bbid')}).fetch()
				)
				.then((entity) => entity.toJSON());

			return Promise.all([
				expect(entityUpdatePromise)
					.to.eventually.have.property('revisionId', 2),
				expect(entityUpdatePromise)
					.to.eventually.have.property('master', true),
				expect(entityUpdatePromise)
					.to.eventually.have.property('ended', true)
			]);
		});
});
