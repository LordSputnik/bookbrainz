/*
 * Copyright (C) 2021  Akash Gupta
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

import bookbrainzData from '../bookbrainz-data';
import chai from 'chai';
import {truncateTables} from '../../src/data/util';


const {expect} = chai;
const {RelationshipAttributeType, bookshelf} = bookbrainzData;

describe('RelationshipAttributeType model', () => {
	afterEach(
		() => truncateTables(bookshelf, ['bookbrainz.relationship_attribute_type'])
	);

	it('should return a JSON object with correct keys when saved', async () => {
		const relAttributeTypeAttribs = {
			id: 1,
			name: 'position',
			root: 1
		};

		const model = await new RelationshipAttributeType(relAttributeTypeAttribs)
			.save(null, {method: 'insert'});
		await model.refresh();
		return expect(model.toJSON()).to.have.all.keys([
			'id', 'parent', 'root', 'childOrder', 'name',
			'description', 'lastUpdated'
		]);
	});
});
